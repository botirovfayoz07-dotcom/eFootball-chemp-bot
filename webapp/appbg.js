// Butun ilova uchun umumiy fon (profilda yoqilgan fon): ekran tepasidan pastigacha, barcha bo'limlarda
window.AppBg = (() => {
  let own = null;                       // foydalanuvchining o'zi yoqqan fon
  const paint = (id) => {
    const el = document.getElementById('appbg');
    if (!el) return;
    const it = id && window.SHOP ? window.SHOP.itemOf('bg', id) : null;
    el.className = it ? 'bg-' + it.id + (it.player ? ' photo' : '') : '';
    document.body.classList.toggle('has-bg', !!it);
  };
  const save = () => { try { own ? localStorage.setItem('appbg', own) : localStorage.removeItem('appbg'); } catch (_) {} };
  return {
    restore() { try { own = localStorage.getItem('appbg') || null; } catch (_) {} paint(own); },   // sahifa ochilishi bilan (server javobini kutmasdan)
    setOwn(id) { own = id || null; save(); paint(own); },     // serverdan kelgan haqiqiy holat
    preview(id) { paint(id); },                               // vaqtincha ko'rsatish (do'kon ko'rinishi, boshqa user profili) — saqlanmaydi
    reset() { paint(own); },
  };
})();
