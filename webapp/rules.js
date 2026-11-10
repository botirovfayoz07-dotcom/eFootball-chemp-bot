// Umumiy qoidalar: o'yinchi bo'limlarni o'qiydi; katta admin tepada o'ngdagi «+» bilan yangi bo'lim qo'shadi (nom + qoidalar matni)
window.RulesView = (() => {
  const tg = window.Telegram?.WebApp;
  const T = {
    uz: { title: 'Umumiy Qoidalar', empty: "Hozircha qoidalar yozilmagan.", newSec: "Yangi bo'lim", editSec: "Bo'limni tahrirlash", name: "Bo'lim nomi", text: 'Qoidalar matni', namePh: "Masalan: Natija kiritish qoidalari", textPh: "Qoidalarni shu yerga yozing...", save: 'Saqlash', del: "O'chirish", edit: 'Tahrirlash', delAsk: "Bu bo'lim o'chirilsinmi?", saved: 'Saqlandi ✅', deleted: "O'chirildi", fail: 'Xatolik, qayta urinib ko\'ring', noTitle: "Bo'lim nomini yozing", noText: 'Qoidalar matnini yozing', back: 'Orqaga', all: 'Barcha bo\'limlar' },
    en: { title: 'General Rules', empty: 'No rules have been written yet.', newSec: 'New section', editSec: 'Edit section', name: 'Section title', text: 'Rules text', namePh: 'E.g. Result submission rules', textPh: 'Write the rules here...', save: 'Save', del: 'Delete', edit: 'Edit', delAsk: 'Delete this section?', saved: 'Saved ✅', deleted: 'Deleted', fail: 'Error, please try again', noTitle: 'Enter a section title', noText: 'Enter the rules text', back: 'Back', all: 'All sections' },
    ru: { title: 'Общие правила', empty: 'Правила пока не написаны.', newSec: 'Новый раздел', editSec: 'Редактировать раздел', name: 'Название раздела', text: 'Текст правил', namePh: 'Например: Правила ввода результата', textPh: 'Напишите правила здесь...', save: 'Сохранить', del: 'Удалить', edit: 'Изменить', delAsk: 'Удалить этот раздел?', saved: 'Сохранено ✅', deleted: 'Удалено', fail: 'Ошибка, попробуйте ещё раз', noTitle: 'Введите название раздела', noText: 'Введите текст правил', back: 'Назад', all: 'Все разделы' },
  };
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const hdr = { 'x-init-data': tg?.initData || '' };
  const api = (url, body) => fetch(url, body === undefined ? { headers: hdr } : { method: 'POST', headers: { ...hdr, 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()).catch(() => ({ error: 'fail' }));

  let el = null, lang = 'uz', toast = () => {}, data = { rules: [], canEdit: false, loaded: false }, mode = 'list', cur = null, editing = null, bound = false;
  const t = () => T[lang] || T.uz;

  function head(left, title, right) {
    return `<header class="g-head"><button class="g-btn" data-r="${left}">${left === 'all' ? '←' : '✕'}</button><h1>📜 ${esc(title)}</h1>${right || '<span class="g-btn ghost"></span>'}</header>`;
  }
  function listView() {
    const items = data.rules.map((r) => `<button class="g-item" data-r="open" data-id="${esc(r.id)}"><span class="g-icon">📜</span><span class="g-txt"><b>${esc(r.title)}</b></span><span class="chev">›</span></button>`).join('');
    const plus = data.canEdit ? `<button class="g-btn rl-plus" data-r="new" aria-label="+">＋</button>` : '';
    return `${head('home', t().title, plus)}<div class="g-body">${data.loaded ? (items || `<p class="g-lead">${t().empty}</p>`) : '<p class="g-lead">…</p>'}</div>`;
  }
  function detailView() {
    const r = data.rules.find((x) => x.id === cur);
    if (!r) { mode = 'list'; return listView(); }
    const adm = data.canEdit ? `<div class="rl-adm"><button class="rl-btn" data-r="edit" data-id="${esc(r.id)}">✎ ${t().edit}</button><button class="rl-btn bad" data-r="del" data-id="${esc(r.id)}">🗑 ${t().del}</button></div>` : '';
    return `${head('all', r.title)}<div class="g-body"><div class="g-card rl-text">${rich(r.text)}</div>${adm}<div class="g-nav"><button class="g-back" data-r="all">← ${t().all}</button></div></div>`;
  }
  function editView() {
    const e = editing || { id: '', title: '', text: '' };
    return `${head(e.id ? 'all' : 'home', e.id ? t().editSec : t().newSec)}<div class="g-body">
      <label class="rl-lbl">${t().name}<input id="rlTitle" class="rl-input" maxlength="80" placeholder="${esc(t().namePh)}" value="${esc(e.title)}"></label>
      <label class="rl-lbl">${t().text}<textarea id="rlText" class="rl-input rl-area" maxlength="8000" placeholder="${esc(t().textPh)}">${esc(e.text)}</textarea></label>
      <button class="rl-save" data-r="save">${t().save}</button></div>`;
  }
  function paint() {
    if (!el) return;
    el.innerHTML = mode === 'edit' ? editView() : mode === 'detail' ? detailView() : listView();
    window.scrollTo(0, 0);
  }
  async function load() {
    const r = await api('/api/rules');
    if (r.rules) data = { rules: r.rules, canEdit: !!r.canEdit, loaded: true };
    else data.loaded = true;
    paint();
  }
  async function onClick(e) {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    const a = b.dataset.r, id = b.dataset.id;
    if (a === 'home') { mode = 'list'; location.hash = ''; history.replaceState(null, '', location.pathname + location.search); window.dispatchEvent(new HashChangeEvent('hashchange')); return; }
    if (a === 'all') { mode = 'list'; cur = null; editing = null; return paint(); }
    if (a === 'open') { mode = 'detail'; cur = id; return paint(); }
    if (a === 'new') { mode = 'edit'; editing = null; return paint(); }
    if (a === 'edit') { editing = { ...data.rules.find((x) => x.id === id) }; mode = 'edit'; return paint(); }
    if (a === 'del') {
      const ok = tg?.showConfirm ? await new Promise((res) => tg.showConfirm(t().delAsk, res)) : window.confirm(t().delAsk);
      if (!ok) return;
      const r = await api(`/api/admin/rules/${id}/delete`, {});
      if (r.ok) { toast(t().deleted); mode = 'list'; cur = null; await load(); } else toast(t().fail);
      return;
    }
    if (a === 'save') {
      const title = el.querySelector('#rlTitle').value.trim(), text = el.querySelector('#rlText').value.trim();
      if (!title) return toast(t().noTitle);
      if (!text) return toast(t().noText);
      b.disabled = true;
      const r = await api(editing?.id ? `/api/admin/rules/${editing.id}` : '/api/admin/rules', { title, text });
      b.disabled = false;
      if (r.ok) { tg?.HapticFeedback?.notificationOccurred('success'); toast(t().saved); mode = 'list'; editing = null; await load(); }
      else toast(t()[r.error] || t().fail);
    }
  }
  function show(node, l, toastFn, id) {
    el = node; lang = l; toast = toastFn || toast;
    if (!bound) { el.addEventListener('click', onClick); bound = true; }
    if (mode !== 'edit') { mode = id ? 'detail' : 'list'; cur = id || null; }
    paint();
    load();
  }
  // Telegram «orqaga»: tahrirlashdan ro'yxatga; ro'yxatdan chiqishda false qaytaradi
  function back() {
    if (mode === 'edit') { mode = editing?.id ? 'detail' : 'list'; if (!editing?.id) cur = null; editing = null; paint(); return true; }
    if (mode === 'detail') { mode = 'list'; cur = null; paint(); return true; }
    return false;
  }
  function leave() { mode = 'list'; cur = null; editing = null; }
  return { show, back, leave };
})();
