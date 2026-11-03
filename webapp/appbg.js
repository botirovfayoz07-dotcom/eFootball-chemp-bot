// Futbolchi fonlari: butun ekran orqa foni (faqat Me bo'limida). Oddiy fonlar (Galaktika, Oltin hashamat...) profil kartasida turadi.
window.AppBg = (() => {
  let own = null;                       // foydalanuvchining yoqqan foni
  const paint = (id) => {
    const el = document.getElementById('appbg');
    if (!el) return;
    const it = id && window.SHOP ? window.SHOP.itemOf('bg', id) : null;
    const on = !!(it && it.player);     // butun ekranga faqat futbolchi fonlari chiqadi
    el.className = on ? 'bg-' + it.id + ' photo' : '';
    document.body.classList.toggle('has-bg', on);
  };
  return {
    restore() { try { own = localStorage.getItem('appbg') || null; } catch (_) {} },
    setOwn(id) { own = id || null; try { own ? localStorage.setItem('appbg', own) : localStorage.removeItem('appbg'); } catch (_) {} },
    show() { paint(own); },             // o'z foni
    preview(id) { paint(id); },         // vaqtincha (do'kon ko'rinishi, boshqa user profili)
    hide() { paint(null); },
  };
})();
