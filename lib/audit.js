'use strict';
const AdminLog = require('../models/AdminLog');

// Admin amalini jurnalga yozadi. Xato bo'lsa asosiy amalni to'xtatmaydi.
async function audit(actor, action, target = '', data = null) {
  try { await AdminLog.create({ actor, action, target: String(target || ''), data }); }
  catch (e) { console.error('audit:', e.message); }
}
module.exports = { audit, AdminLog };
