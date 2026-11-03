/* ============================================================================
   liquid.js — Liquid Glass interaksiyalari
   ----------------------------------------------------------------------------
   1) Specular tracking : barmoq/pointer turgan joyga qarab shishadagi yorug'lik
      siljiydi (--mx / --my CSS o'zgaruvchilari orqali).
   2) Press ripple      : bosilganda yumshoq yorug'lik to'lqini.
   Hech qanday kutubxonaga bog'liq emas; xato bo'lsa jim o'chadi.
   ========================================================================== */
(() => {
  'use strict';

  try {
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const HL = [
      '.card', '.guide', '.g-item', '.g-card', '.p-card', '.p-hero', '.lc', '.flag',
      '.chip', '.ct', '.club', '.pf-card', '.l-hero', '.p-form', '.p-match', '.note',
      '.cup', '.p-empty', '.back', '.p-filter button'
    ].join(',');

    const PRESS = [
      '.card', '.p-btn', '.chip', '.ct', '.club', '.lc', '.g-item', '.l-nav button',
      '.seg button', '.p-new', '.p-back', '.rb-in', '.guide', '.back', '.g-btn'
    ].join(',');

    const isEl = (n) => n instanceof Element;
    const closest = (target, sel) => (isEl(target) ? target.closest(sel) : null);

    /* ------------------------- 1. specular tracking ----------------------- */
    let raf = 0;
    let pending = null;

    function apply(el, x, y) {
      el.style.setProperty('--mx', x + '%');
      el.style.setProperty('--my', y + '%');
    }

    function onMove(e) {
      const el = closest(e.target, HL);
      if (!el) return;
      pending = { el, x: e.clientX, y: e.clientY };
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const p = pending;
        pending = null;
        if (!p || !p.el.isConnected) return;
        const r = p.el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const x = Math.max(-10, Math.min(110, ((p.x - r.left) / r.width) * 100));
        const y = Math.max(-10, Math.min(110, ((p.y - r.top) / r.height) * 100));
        apply(p.el, x, y);
      });
    }

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerdown', onMove, { passive: true });

    /* ----------------------------- 2. ripple ----------------------------- */
    function ripple(e) {
      if (reduce) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      const el = closest(e.target, PRESS);
      if (!el) return;
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
      if (el.classList.contains('taken')) return;

      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;

      const cs = getComputedStyle(el);
      if (cs.position === 'static') el.style.position = 'relative';
      if (cs.overflow === 'visible') el.style.overflow = 'hidden';

      const size = Math.max(r.width, r.height) * 1.6;
      const dot = document.createElement('span');
      dot.className = 'lg-ripple';
      dot.setAttribute('aria-hidden', 'true');
      dot.style.width = dot.style.height = size + 'px';
      dot.style.left = (e.clientX - r.left) + 'px';
      dot.style.top = (e.clientY - r.top) + 'px';

      el.appendChild(dot);
      window.setTimeout(() => dot.remove(), 680);
    }

    document.addEventListener('pointerdown', ripple, { passive: true });

  } catch (_) {
    /* hech narsa: dizayn JS'siz ham ishlaydi */
  }
})();
