// Server xatolarini adminlarga Telegramda yuboradi.
// Bir xil xato windowMs (standart 10 daqiqa) ichida faqat bir marta yuboriladi — spam bo'lmasin.
module.exports = function createAlerter(send, windowMs = 10 * 60 * 1000) {
  const seen = new Map();
  return function alert(where, err) {
    try {
      const msg = String(err?.message || err || '').slice(0, 300);
      console.error(`[${where}]`, err);
      const key = where + '|' + msg, now = Date.now();
      for (const [k, t] of seen) if (now - t > windowMs) seen.delete(k);
      if (seen.has(key)) return;
      seen.set(key, now);
      const when = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
      Promise.resolve(send(`🚨 Xatolik\n📍 ${where}\n💬 ${msg}\n🕒 ${when}`)).catch(() => {});
    } catch (_) { /* monitoring o'zi serverni qulatmasin */ }
  };
};
