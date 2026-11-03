'use strict';

// Mavsum starti API.
// Start sanasi ADMIN PANELDA kiritiladi; shu yerdan butun tizim (ligalar + kuboklar) o'qiydi.

const season = require('./season');

module.exports = function registerSeasonRoutes(app, { tgUser, adminIds = [] }) {
  const ADMIN_IDS = new Set(adminIds.map(Number).filter(Number.isFinite));
  const isAdmin = (id) => ADMIN_IDS.has(Number(id));
  const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // ——— Ommaviy: kalendar + bitta davlat paketi (mini app uchun) ———
  app.get('/api/season', ah(async (req, res) => {
    if (!tgUser(req)) return res.status(401).json({ error: 'auth' });
    const country = String(req.query.country || 'en').slice(0, 8);
    res.json({
      calendar: await season.calendar(),
      bundle: await season.bundle(country),
      source: (await season.state()).source,
    });
  }));

  // ——— Admin: joriy sozlama ———
  app.get('/api/admin/season', ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    if (!isAdmin(u.id)) return res.status(403).json({ error: 'forbidden' });
    const st = await season.state();
    res.json({
      ok: true,
      ...st,
      // Admin nima birga boshlanishini ko'rsin
      bundles: {
        en: await season.bundle('en'),
      },
    });
  }));

  // ——— Admin: start sanasini belgilash ———
  const save = ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    if (!isAdmin(u.id)) return res.status(403).json({ error: 'forbidden' });
    try {
      const st = await season.setSchedule({ ...(req.body || {}), adminId: u.id });
      res.json({ ok: true, ...st });
    } catch (e) {
      const code = e.code === 'time' || e.code === 'range' ? e.code : 'fail';
      res.status(code === 'fail' ? 500 : 400).json({ error: code });
    }
  });
  app.patch('/api/admin/season', save);
  app.put('/api/admin/season', save);
};
