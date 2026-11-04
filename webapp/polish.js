// 1) Skeleton: ma'lumot kelguncha kulrang to'rtburchaklar (window.Skel)
// 2) Haptic: tugmalar bosilganda Telegram titrashi (barcha ekranlarda bir joydan)
window.Skel = (() => {
  const line = (w = '100%', h = 14) => `<i class="sk sk-line" style="width:${w};height:${h}px"></i>`;
  const card = (a = '62%', b = '38%') => `<div class="g-card sk-card"><i class="sk sk-ava"></i><span>${line(a, 15)}${line(b, 11)}</span></div>`;
  return {
    line,
    rows: (n = 3) => Array.from({ length: n }, () => card()).join(''),
    kpis: () => `<div class="st-grid">${Array.from({ length: 4 }, () => `<div class="g-card st-kpi">${line('55%', 26)}${line('80%', 11)}</div>`).join('')}</div>${card('70%', '45%')}${card('55%', '30%')}`,
    page: () => `${line('48%', 26)}<div style="height:14px"></div>${card()}${card('70%', '40%')}${card('50%', '28%')}${card()}`,
    // jadval uchun: n qator, cols ustun
    tableRows: (n = 8, cols = 10) => Array.from({ length: n }, () => `<tr class="sk-tr">${Array.from({ length: cols }, (_, i) => `<td${i === 1 ? ' class="pl"' : ''}>${i === 1 ? line('85%', 16) : line('60%', 14)}</td>`).join('')}</tr>`).join(''),
  };
})();

(() => {
  const H = window.Telegram?.WebApp?.HapticFeedback;
  if (!H) return;
  // Bir bosishda ikki marta titramasligi uchun: 80 ms ichidagi takroriy impact/selection o'tkazib yuboriladi
  let last = 0;
  try {
    ['impactOccurred', 'selectionChanged', 'notificationOccurred'].forEach((k) => {
      const f = H[k]?.bind(H);
      if (!f) return;
      H[k] = (...a) => { const now = Date.now(); if (k !== 'notificationOccurred' && now - last < 80) return H; last = now; return f(...a); };
    });
  } catch (_) { /* ba'zi eski klientlarda yozib bo'lmaydi — oddiy ishlayveradi */ }

  const TARGET = 'button, [role="button"], .chip, [data-act], [data-tab], [data-section], [data-club], [data-lg], [data-mc], [data-pv], [data-chip], [data-grp]';
  const SELECT = '.chip, .seg button, .ad-tabs button, .lang-menu button, [data-tab], [data-chip], [data-grp]';
  document.addEventListener('click', (e) => {
    const el = e.target.closest(TARGET);
    if (!el || el.disabled || el.closest('[data-nohaptic]')) return;
    try {
      if (el.matches(SELECT)) H.selectionChanged();
      else if (el.matches('.bad, .danger')) H.impactOccurred('heavy');
      else if (el.matches('.ok, .primary')) H.impactOccurred('medium');
      else H.impactOccurred('light');
    } catch (_) {}
  });
})();
