window.GuideView = (() => {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const topicOf = (lang, id) => ({ ...window.GUIDE.uz.topics[id], ...(window.GUIDE[lang].topics[id] || {}) });
  const uiOf = (lang) => ({ ...window.GUIDE.uz.ui, ...window.GUIDE[lang].ui });

  function head(left, title, right) {
    return `<header class="g-head"><button class="g-btn" data-go="${left}">${left === 'index' ? '←' : '✕'}</button>
      <h1>📖 ${esc(title)}</h1>${right ? `<button class="g-btn" data-go="">✕</button>` : '<span class="g-btn ghost"></span>'}</header>`;
  }

  function index(lang) {
    const ui = uiOf(lang);
    const items = window.GUIDE_ORDER.map(([id, icon]) => {
      const t = topicOf(lang, id);
      return `<button class="g-item" data-go="${id}"><span class="g-icon">${icon}</span>
        <span class="g-txt"><b>${esc(t.title)}</b><small>${esc(t.sub)}</small></span><span class="chev">›</span></button>`;
    }).join('');
    return `${head('', ui.title, false)}<div class="g-body"><p class="g-lead">${esc(ui.intro)}</p>${items}</div>`;
  }

  function topic(lang, id) {
    const ui = uiOf(lang), t = topicOf(lang, id);
    const pos = window.GUIDE_ORDER.findIndex(([k]) => k === id);
    const icon = window.GUIDE_ORDER[pos][1];
    const secs = t.sections.map((s) => {
      const body = s.type === 'steps'
        ? s.items.map((x, i) => `<div class="g-card g-step"><i>${i + 1}</i><p>${rich(x)}</p></div>`).join('')
        : `<div class="g-card"><ul>${s.items.map((x) => `<li>${rich(x)}</li>`).join('')}</ul></div>`;
      return `<div class="g-label"><span>${esc(ui[s.label])}</span></div>${body}`;
    }).join('');
    const next = window.GUIDE_ORDER[pos + 1];
    const contact = next ? '' : `<a class="g-card g-contact" href="https://t.me/${window.ADMIN.slice(1)}" data-admin>✉️ ${esc(ui.contact)}: ${window.ADMIN}</a>`;
    const nav = `<div class="g-nav"><button class="g-back" data-go="">← ${esc(ui.all)}</button>` +
      (next ? `<button class="g-next" data-go="${next[0]}">${esc(topicOf(lang, next[0]).title)} ›</button>` : '') + `</div>`;
    return `${head('index', t.title, true)}<div class="g-body"><div class="g-card g-intro"><span>${icon}</span><p>${esc(t.intro)}</p></div>${secs}${contact}${nav}</div>`;
  }

  function render(el, lang, id) {
    el.innerHTML = id && window.GUIDE.uz.topics[id] ? topic(lang, id) : index(lang);
    window.scrollTo(0, 0);
  }
  return { render };
})();
