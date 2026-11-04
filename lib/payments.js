// Avtomatik to'lov: Payme (Merchant API, JSON-RPC) va Click (Shop API: prepare / complete).
// Ikkala tizim ham to'lovni TopUp yozuvi orqali tasdiqlaydi. Coins faqat to'lov tasdiqlangandan keyin qo'shiladi.
// Endpointlar: POST /payme   ·   POST /click/prepare   ·   POST /click/complete
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const TopUp = require('../models/TopUp');
const User = require('../models/User');
const { logCoins, adjustCoins } = require('./economy');

const TWELVE_H = 12 * 60 * 60 * 1000;     // Payme: tranzaksiya 12 soatdan keyin bekor qilinadi (sana: reason 4)

const CFG = {
  paymeLogin: process.env.PAYME_LOGIN || 'Paycom',
  paymeId: process.env.PAYME_MERCHANT_ID || '',
  paymeKey: process.env.PAYME_KEY || '',
  paymeCheckout: process.env.PAYME_CHECKOUT_URL || 'https://checkout.paycom.uz',
  clickService: process.env.CLICK_SERVICE_ID || '',
  clickMerchant: process.env.CLICK_MERCHANT_ID || '',
  clickSecret: process.env.CLICK_SECRET_KEY || '',
};
const enabled = {
  payme: !!(CFG.paymeId && CFG.paymeKey),
  click: !!(CFG.clickService && CFG.clickMerchant && CFG.clickSecret),
};

const safeEq = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const validId = (x) => mongoose.isValidObjectId(x) && String(x).length === 24;
const expired = (tu) => Date.now() - Number(tu.providerCreateTime || 0) > TWELVE_H;

// To'lov havolasi. Payme: base64 ("m=...;ac.order_id=...;a=<tiyin>;c=<qaytish>"). Click: to'g'ridan-to'g'ri URL.
function paymeLink(tu, returnUrl) {
  const raw = `m=${CFG.paymeId};ac.order_id=${tu._id};a=${tu.amount * 100};c=${returnUrl}`;
  return `${CFG.paymeCheckout}/${Buffer.from(raw, 'utf8').toString('base64')}`;
}
function clickLink(tu, returnUrl) {
  const q = new URLSearchParams({
    service_id: CFG.clickService, merchant_id: CFG.clickMerchant,
    amount: String(tu.amount), transaction_param: String(tu._id), return_url: returnUrl,
  });
  return `https://my.click.uz/services/pay?${q.toString()}`;
}
const linkFor = (prov, tu, returnUrl) => (prov === 'payme' ? paymeLink : clickLink)(tu, returnUrl);

// Coins qo'shish va xabar yuborish (xatolik bo'lsa holat qaytariladi — chaqiruvchi hal qiladi)
let notifyUser = async () => {};
async function creditUser(tu, provider) {
  await User.updateOne({ telegramId: tu.telegramId }, { $inc: { coins: tu.coins } }, { upsert: true });
  await logCoins(tu.telegramId, tu.coins, 'topup', String(tu._id), null, provider);
  notifyUser(tu.telegramId, {
    uz: `✅ To'lov qabul qilindi: hisobingizga +${tu.coins} Coins qo'shildi.`,
    en: `✅ Payment received: +${tu.coins} Coins added to your balance.`,
    ru: `✅ Оплата получена: на баланс добавлено +${tu.coins} Coins.`,
  }).catch(() => {});
}

// ——— PAYME ———
class PErr extends Error {
  constructor(code, data) { super('payme ' + code); this.code = code; this.data = data ?? null; }
}
const PMSG = {
  '-32700': { uz: "JSON noto'g'ri", ru: 'Ошибка парсинга JSON', en: 'Parse error' },
  '-32600': { uz: "So'rov noto'g'ri", ru: 'Неверный запрос', en: 'Invalid request' },
  '-32601': { uz: 'Metod topilmadi', ru: 'Метод не найден', en: 'Method not found' },
  '-32504': { uz: 'Ruxsat yetarli emas', ru: 'Недостаточно привилегий', en: 'Insufficient privileges' },
  '-32400': { uz: 'Tizim xatosi', ru: 'Системная ошибка', en: 'System error' },
  '-31001': { uz: "Noto'g'ri summa", ru: 'Неверная сумма', en: 'Incorrect amount' },
  '-31003': { uz: 'Tranzaksiya topilmadi', ru: 'Транзакция не найдена', en: 'Transaction not found' },
  '-31007': { uz: "Tranzaksiyani bekor qilib bo'lmaydi", ru: 'Невозможно отменить транзакцию', en: 'Cannot cancel transaction' },
  '-31008': { uz: "Amalni bajarib bo'lmaydi", ru: 'Невозможно выполнить операцию', en: 'Unable to complete operation' },
  '-31050': { uz: 'Buyurtma topilmadi', ru: 'Заказ не найден', en: 'Order not found' },
};
const rpcError = (id, code, data) => ({
  jsonrpc: '2.0', id,
  error: { code: Number(code), message: PMSG[code] || { uz: 'Xato', ru: 'Ошибка', en: 'Error' }, data: data ?? null },
});

function paymeAuthOk(req) {
  if (!enabled.payme) return false;
  const h = String(req.get('authorization') || '');
  if (!h.startsWith('Basic ')) return false;
  const dec = Buffer.from(h.slice(6), 'base64').toString('utf8');
  const i = dec.indexOf(':');
  if (i < 0) return false;
  return safeEq(dec.slice(0, i), CFG.paymeLogin) && safeEq(dec.slice(i + 1), CFG.paymeKey);
}

async function paymeOrder(params) {
  const oid = params?.account?.order_id;
  const tu = validId(oid) ? await TopUp.findOne({ _id: oid, provider: 'payme' }).lean() : null;
  if (!tu) throw new PErr(-31050, 'order_id');
  return tu;
}
async function paymeTx(id) {
  const tu = await TopUp.findOne({ provider: 'payme', providerTxId: String(id) }).lean();
  if (!tu) throw new PErr(-31003);
  return tu;
}
function checkAmount(tu, amount) {
  if (Number(amount) !== tu.amount * 100) throw new PErr(-31001);
}
async function cancelPending(tu, reason) {
  await TopUp.updateOne({ _id: tu._id, providerState: 1 }, {
    $set: { providerState: -1, providerCancelTime: Date.now(), providerReason: Number(reason), status: 'rejected' },
  });
}

const PAYME = {
  async CheckPerformTransaction(p) {
    const tu = await paymeOrder(p);
    checkAmount(tu, p.amount);
    if (tu.status !== 'pending') throw new PErr(-31008);
    return { allow: true };
  },

  async CreateTransaction(p) {
    const tu = await paymeOrder(p);
    checkAmount(tu, p.amount);
    if (tu.providerTxId === String(p.id)) {                  // takroriy so'rov
      if (tu.providerState === 1 && expired(tu)) { await cancelPending(tu, 4); throw new PErr(-31008); }
      if (tu.providerState !== 1) throw new PErr(-31008);
      return { create_time: tu.providerCreateTime, transaction: String(tu._id), state: 1 };
    }
    if (tu.providerTxId || tu.status !== 'pending') throw new PErr(-31008);
    const ok = await TopUp.findOneAndUpdate(
      { _id: tu._id, status: 'pending', providerTxId: null },
      { $set: { providerTxId: String(p.id), providerCreateTime: Number(p.time), providerState: 1 } }
    ).lean();
    if (!ok) throw new PErr(-31008);
    return { create_time: Number(p.time), transaction: String(tu._id), state: 1 };
  },

  async PerformTransaction(p) {
    const tu = await paymeTx(p.id);
    const done = (x) => ({ transaction: String(x._id), perform_time: x.providerPerformTime, state: 2 });
    if (tu.providerState === 2) return done(tu);
    if (tu.providerState !== 1) throw new PErr(-31008);
    if (expired(tu)) { await cancelPending(tu, 4); throw new PErr(-31008); }
    const perform = Date.now();
    // Shartli o'tish: faqat bir marta tasdiqlanadi (parallel so'rovlarda ham ikki marta Coins qo'shilmaydi)
    const won = await TopUp.findOneAndUpdate(
      { _id: tu._id, status: 'pending', providerState: 1 },
      { $set: { status: 'approved', providerState: 2, providerPerformTime: perform, doneAt: new Date() } },
      { new: true }
    ).lean();
    if (!won) {
      const again = await TopUp.findById(tu._id).lean();
      if (again?.providerState === 2) return done(again);
      throw new PErr(-31008);
    }
    try { await creditUser(won, 'payme'); }
    catch (e) {
      await TopUp.updateOne({ _id: tu._id }, { $set: { status: 'pending', providerState: 1 }, $unset: { providerPerformTime: 1, doneAt: 1 } });
      throw e;
    }
    return { transaction: String(tu._id), perform_time: perform, state: 2 };
  },

  async CancelTransaction(p) {
    const tu = await paymeTx(p.id);
    const reason = p.reason ?? null;
    if (tu.providerState === 1) {
      await cancelPending(tu, reason);
      return { transaction: String(tu._id), cancel_time: Date.now(), state: -1 };
    }
    if (tu.providerState === 2) {
      // Coins sarflanmagan bo'lsa qaytariladi (adjustCoins o'zi balansni tekshiradi va audit logga yozadi)
      const r = await adjustCoins({ topupId: String(tu._id), actor: null, reason: 'Payme: tranzaksiya bekor qilindi' });
      if (!r.ok) throw new PErr(-31007);
      const t = Date.now();
      await TopUp.updateOne({ _id: tu._id }, { $set: { providerState: -2, providerCancelTime: t, providerReason: Number(reason) } });
      return { transaction: String(tu._id), cancel_time: t, state: -2 };
    }
    if (tu.providerState === -1 || tu.providerState === -2) {          // allaqachon bekor qilingan
      return { transaction: String(tu._id), cancel_time: tu.providerCancelTime || 0, state: tu.providerState };
    }
    throw new PErr(-31008);
  },

  async CheckTransaction(p) {
    const tu = await paymeTx(p.id);
    return {
      create_time: tu.providerCreateTime, perform_time: tu.providerPerformTime || 0,
      cancel_time: tu.providerCancelTime || 0, transaction: String(tu._id),
      state: tu.providerState, reason: tu.providerReason ?? null,
    };
  },

  async GetStatement(p) {
    const rows = await TopUp.find({
      provider: 'payme', providerTxId: { $ne: null },
      providerCreateTime: { $gte: Number(p.from), $lte: Number(p.to) },
    }).sort({ providerCreateTime: 1 }).lean();
    return {
      transactions: rows.map((x) => ({
        id: x.providerTxId, time: x.providerCreateTime, amount: x.amount * 100,
        account: { order_id: String(x._id) }, create_time: x.providerCreateTime,
        perform_time: x.providerPerformTime || 0, cancel_time: x.providerCancelTime || 0,
        transaction: String(x._id), state: x.providerState, reason: x.providerReason ?? null,
      })),
    };
  },
};

// ——— CLICK ———
const CMSG = {
  '-1': 'SIGN CHECK FAILED!', '-2': 'Incorrect parameter amount', '-3': 'Action not found',
  '-4': 'Already paid', '-5': 'User does not exist', '-6': 'Transaction not found',
  '-8': 'Error in request from click', '-9': 'Transaction cancelled',
};
const cResp = (b, error, extra = {}) => ({
  click_trans_id: Number(b.click_trans_id), merchant_trans_id: String(b.merchant_trans_id ?? ''),
  ...extra, error, error_note: error === 0 ? 'Success' : CMSG[String(error)] || 'Error',
});
// sign_string = md5(click_trans_id + service_id + SECRET + merchant_trans_id [+ merchant_prepare_id] + amount + action + sign_time)
function clickSignOk(b, complete) {
  const parts = [b.click_trans_id, b.service_id, CFG.clickSecret, b.merchant_trans_id,
    ...(complete ? [b.merchant_prepare_id] : []), b.amount, b.action, b.sign_time];
  return safeEq(md5(parts.map((x) => (x == null ? '' : String(x))).join('')), String(b.sign_string || ''));
}
async function clickOrder(id) {
  return validId(id) ? TopUp.findOne({ _id: id, provider: 'click' }).lean() : null;
}

// ——— Ro'yxatga olish ———
function mount(app, deps) {
  notifyUser = deps.notifyUser || notifyUser;
  const alert = deps.alert || (() => {});
  const urlenc = express.urlencoded({ extended: false });

  app.post('/payme', express.text({ type: '*/*', limit: '1mb' }), async (req, res) => {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) { return res.json(rpcError(null, '-32700')); }
    }
    const id = body?.id ?? null;
    if (!paymeAuthOk(req)) return res.json(rpcError(id, '-32504'));
    const method = body?.method;
    if (typeof method !== 'string') return res.json(rpcError(id, '-32600'));
    if (!Object.prototype.hasOwnProperty.call(PAYME, method)) return res.json(rpcError(id, '-32601', method));
    try {
      res.json({ jsonrpc: '2.0', id, result: await PAYME[method](body.params || {}) });
    } catch (e) {
      if (e instanceof PErr) return res.json(rpcError(id, String(e.code), e.data));
      alert('Payme ' + method, e);
      res.json(rpcError(id, '-32400'));
    }
  });

  app.post('/click/prepare', urlenc, async (req, res) => {
    const b = req.body || {};
    try {
      if (!enabled.click || String(b.service_id) !== CFG.clickService) return res.json(cResp(b, -8, { merchant_prepare_id: null }));
      if (!clickSignOk(b, false)) return res.json(cResp(b, -1, { merchant_prepare_id: null }));
      if (Number(b.action) !== 0) return res.json(cResp(b, -3, { merchant_prepare_id: null }));
      const tu = await clickOrder(b.merchant_trans_id);
      if (!tu) return res.json(cResp(b, -5, { merchant_prepare_id: null }));
      if (Number(b.amount) !== tu.amount) return res.json(cResp(b, -2, { merchant_prepare_id: null }));
      if (tu.status === 'approved') return res.json(cResp(b, -4, { merchant_prepare_id: null }));
      if (tu.status !== 'pending') return res.json(cResp(b, -9, { merchant_prepare_id: null }));
      // Takroriy prepare: avvalgi prepare_id qaytariladi
      if (tu.providerTxId === String(b.click_trans_id) && tu.providerState === 1) {
        return res.json(cResp(b, 0, { merchant_prepare_id: tu.providerPrepareId }));
      }
      const prepId = Math.floor(Math.random() * 2e9) + 1;
      const up = await TopUp.findOneAndUpdate(
        { _id: tu._id, status: 'pending', $or: [{ providerTxId: null }, { providerTxId: String(b.click_trans_id) }] },
        { $set: { providerTxId: String(b.click_trans_id), providerPrepareId: prepId, providerState: 1, providerCreateTime: Date.now() } },
        { new: true }
      ).lean();
      if (!up) return res.json(cResp(b, -9, { merchant_prepare_id: null }));
      res.json(cResp(b, 0, { merchant_prepare_id: up.providerPrepareId }));
    } catch (e) {
      alert('Click prepare', e);
      res.json(cResp(b, -8, { merchant_prepare_id: null }));
    }
  });

  app.post('/click/complete', urlenc, async (req, res) => {
    const b = req.body || {};
    try {
      if (!enabled.click || String(b.service_id) !== CFG.clickService) return res.json(cResp(b, -8, { merchant_confirm_id: null }));
      if (!clickSignOk(b, true)) return res.json(cResp(b, -1, { merchant_confirm_id: null }));
      if (Number(b.action) !== 1) return res.json(cResp(b, -3, { merchant_confirm_id: null }));
      const tu = await clickOrder(b.merchant_trans_id);
      if (!tu || String(tu.providerTxId) !== String(b.click_trans_id) || Number(tu.providerPrepareId) !== Number(b.merchant_prepare_id)) {
        return res.json(cResp(b, -6, { merchant_confirm_id: null }));
      }
      if (Number(b.error) < 0) {                                     // Click o'zi to'lovni bekor qildi
        if (tu.status === 'pending') {
          await TopUp.updateOne({ _id: tu._id, status: 'pending' }, { $set: { status: 'rejected', providerState: -1, providerCancelTime: Date.now() } });
        }
        return res.json(cResp(b, -9, { merchant_confirm_id: null }));
      }
      if (tu.status === 'approved') return res.json(cResp(b, 0, { merchant_confirm_id: tu.providerPrepareId }));  // takroriy
      if (tu.status !== 'pending') return res.json(cResp(b, -9, { merchant_confirm_id: null }));
      if (Number(b.amount) !== tu.amount) return res.json(cResp(b, -2, { merchant_confirm_id: null }));
      const won = await TopUp.findOneAndUpdate(
        { _id: tu._id, status: 'pending' },
        { $set: { status: 'approved', providerState: 2, providerPerformTime: Date.now(), doneAt: new Date() } },
        { new: true }
      ).lean();
      if (!won) return res.json(cResp(b, -4, { merchant_confirm_id: null }));
      try { await creditUser(won, 'click'); }
      catch (e) {
        await TopUp.updateOne({ _id: tu._id }, { $set: { status: 'pending', providerState: 1 }, $unset: { providerPerformTime: 1, doneAt: 1 } });
        throw e;
      }
      res.json(cResp(b, 0, { merchant_confirm_id: tu.providerPrepareId }));
    } catch (e) {
      alert('Click complete', e);
      res.json(cResp(b, -8, { merchant_confirm_id: null }));
    }
  });
}

module.exports = { enabled, linkFor, mount, TWELVE_H, _CFG: CFG };
