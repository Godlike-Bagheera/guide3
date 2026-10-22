/* Точка входа: объединённый scroll-хендлер + глобальные хоткеи */

(() => {
  'use strict';

  const totop = document.getElementById('totop');
  const hotkeysModal = document.getElementById('hotkeysModal');
  const hotkeysBtn = document.getElementById('hotkeysBtn');

  /* ─── ОДИН scroll-листенер + rAF для всего ─── */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      if (typeof window.updateReadingBar === 'function') window.updateReadingBar();
      if (totop) totop.classList.toggle('show', window.scrollY > 400);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // запустим сразу

  if (totop) {
    totop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ─── Хоткеи-модалка ─── */
  if (hotkeysBtn && hotkeysModal && window.GuideModal) {
    hotkeysBtn.addEventListener('click', () => window.GuideModal.open(hotkeysModal));
  }

  /* ─── Глобальные хоткеи ─── */
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    const inField = tag === 'INPUT' || tag === 'TEXTAREA';

    // Ctrl/⌘ + K — фокус на поиск
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (window.GuideSearch) window.GuideSearch.focus();
      return;
    }

    // Esc — очистить поиск или закрыть модалки
    if (e.key === 'Escape') {
      if (window.GuideSearch && document.activeElement === window.GuideSearch.input) {
        window.GuideSearch.clear();
        window.GuideSearch.input.blur();
      }
      document.querySelectorAll('.modal-overlay.show').forEach(m => {
        if (window.GuideModal) window.GuideModal.close(m);
        else m.classList.remove('show');
      });
      return;
    }

    // ? — открыть хоткеи
    if (e.key === '?' && !inField && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (window.GuideModal && hotkeysModal) window.GuideModal.open(hotkeysModal);
      return;
    }

    // [ и ] — навигация по совпадениям поиска
    if (!inField && window.GuideSearch && window.GuideSearch.hasMarks) {
      if (e.key === '[') { e.preventDefault(); window.GuideSearch.goToMatch(-1); return; }
      if (e.key === ']') { e.preventDefault(); window.GuideSearch.goToMatch(1);  return; }
    }

    // J / K — следующая / предыдущая секция
    if (!inField && window.GuideTOC) {
      if (e.key === 'j' || e.key === 'J') { e.preventDefault(); window.GuideTOC.next(); }
      if (e.key === 'k' || e.key === 'K') { e.preventDefault(); window.GuideTOC.prev(); }
    }
  });

  /* ─── Консоль ─── */
  console.log(
    '%c🌸 Гайд Django + DRF + React готов к чтению!',
    'color:#ec4899;font-size:16px;font-weight:bold;'
  );
  console.log(
    '%cCtrl+K — поиск • [ ] — совпадения • J/K — секции • ? — хоткеи • Ctrl+P — PDF',
    'color:#a855f7;'
  );
})();