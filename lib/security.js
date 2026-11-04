// API so'rovlarini cheklash (express-rate-limit).
// Kalit: Telegram ID (initData imzosi tekshirilgan bo'lsa), aks holda IP manzil.
const rateLimit = require('express-rate-limit');

const ipOf = (req) => (rateLimit.ipKeyGenerator ? rateLimit.ipKeyGenerator(req.ip || '') : req.ip || '');

module.exports = function makeLimiters({ tgUser }) {
  const keyOf = (req) => {
    const u = tgUser(req);
    return u ? 'u' + u.id : 'ip' + ipOf(req);
  };
  const make = (windowMs, max) => rateLimit({
    windowMs,
    max,
    keyGenerator: keyOf,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'tooMany' },
  });
  return {
    global: make(60 * 1000, 600),     // hamma /api: daqiqada 600 ta so'rov
    topup: make(10 * 60 * 1000, 5),   // chek yuborish: 10 daqiqada 5 ta
    money: make(60 * 1000, 20),       // do'kon, sotish, kunlik bonus: daqiqada 20 ta
    chat: make(60 * 1000, 40),        // chat, hisob kiritish, yordam: daqiqada 40 ta
  };
};
