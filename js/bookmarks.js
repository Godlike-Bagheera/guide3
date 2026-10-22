/* Закладки: клавиша B закладывает активный раздел; в сайдбаре — звёздочки
   для каждого раздела и ссылка «⭐ Закладки» на отдельную страницу
   bookmarks.html. Список закладок НЕ вставляется в <main> гайда — это ломало
   сетку страницы; он живёт на своей странице (js/bookmarks-page.js). */

(() => {
  'use strict';

  const KEY = 'guide.bookmarks.v1';

  // Гайд разбит на страницы: в localStorage закладки хранятся под чистым id
  // раздела, а data-section кнопок может быть "id@страница" — нормализуем.
  function pureId(id) { return id.split('@')[0]; }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }

  /* ─── Звёздочки в оглавлении (по одной на ссылку toc) ─── */
  // Вставляются внутрь <a> как <span>, поэтому layout оглавления не меняется.
  // Собираем ссылки оглавления: локальные (#id) и межстраничные (page.html#id).
  const tocAnchors = [...document.querySelectorAll('nav.toc ul a[data-star], nav.toc ul a[href*="#"]')]
    .filter(a => !/^(https?:|mailto:)/.test(a.getAttribute('href') || ''));

  tocAnchors.forEach(a => {
    if (a.querySelector('.bm-star')) return;
    const href = a.getAttribute('href') || '';
    const hashIdx = href.indexOf('#');
    const id = hashIdx >= 0 ? href.slice(hashIdx + 1) : '';
    if (!id) return;
    const star = document.createElement('span');
    star.className = 'bm-star';
    star.dataset.section = id;
    star.title = 'В закладки / убрать (B)';
    star.setAttribute('role', 'button');
    star.setAttribute('tabindex', '0');
    star.setAttribute('aria-label', 'Добавить раздел в закладки');
    star.textContent = '☆';
    const toggleHere = e => {
      e.preventDefault();
      e.stopPropagation();
      toggle(id);
    };
    star.addEventListener('click', toggleHere);
    star.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') toggleHere(e);
    });
    a.appendChild(star);
  });

  /* ─── Счётчик в ссылке «⭐ Закладки» под оглавлением ─── */
  const badge = document.getElementById('tocBmCount');

  /* ─── Закладка текущего раздела: звёздочка в шапке (рядом со счётчиком) ─── */
  // Раньше «Добавить в закладки» была кнопкой под каждым разделом — при
  // переходе по меню сверху висела чужая кнопка. Теперь закладка ставится
  // звёздочкой в шапке для активного (читаемого) раздела; дубли кнопок
  // .mark-read[data-bm] удаляются из DOM.
  document.querySelectorAll('button.mark-read[data-bm]').forEach(b => b.remove());
  const headerBm = (() => {
    const link = document.querySelector('a.bm-page-link');
    if (!link || !link.parentNode) return null;
    const star = document.createElement('span');
    star.className = 'bm-star bm-star-current';
    star.id = 'bmCurrent';
    star.title = 'Добавить текущий раздел в закладки / убрать (B)';
    star.setAttribute('role', 'button');
    star.setAttribute('tabindex', '0');
    star.textContent = '☆';
    star.addEventListener('click', () => {
      const active = document.querySelector('nav.toc a.active');
      let id = '';
      if (active) {
        const href = active.getAttribute('href') || '';
        const hi = href.indexOf('#');
        if (hi >= 0) id = href.slice(hi + 1);
      }
      if (!id && location.hash) id = decodeURIComponent(location.hash.slice(1));
      if (!id) {
        if (typeof window.showToast === 'function') window.showToast('Откройте любой раздел');
        return;
      }
      toggle(id);
    });
    star.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); star.click(); }
    });
    link.insertAdjacentElement('afterend', star);
    return star;
  })();

  function syncUI() {
    const state = load();
    const count = Object.keys(state).filter(id => state[id]).length;
    document.querySelectorAll('.bm-star').forEach(s => {
      const sec = s.dataset && s.dataset.section;
      if (!sec) return; // элементы без data-section (например, SVG-звезда в шапке) пропускаем
      const on = !!state[pureId(sec)];
      s.classList.toggle('active', on);
      s.textContent = on ? '★' : '☆';
      s.setAttribute('aria-label', on ? 'Убрать раздел из закладок' : 'Добавить раздел в закладки');
    });
    // Звёздочка в шапке = состояние ТЕКУЩЕГО активного раздела
    if (headerBm) {
      const active = document.querySelector('nav.toc a.active');
      const href = active ? (active.getAttribute('href') || '') : '';
      const curId = href.includes('#') ? href.slice(href.indexOf('#') + 1) : (location.hash.slice(1) || '');
      const on = curId && !!state[pureId(curId)];
      headerBm.classList.toggle('active', !!on);
      headerBm.textContent = on ? '★' : '☆';
    }
    if (badge) badge.textContent = count ? String(count) : '';
    // Счётчик на звёздочке в шапке (ссылка на страницу закладок)
    document.querySelectorAll('.bm-counter').forEach(el => {
      el.textContent = count ? String(count) : '';
    });
    // Заливаем SVG-звезду в шапке, если есть закладки
    document.querySelectorAll('a.bm-page-link').forEach(a => {
      a.classList.toggle('has-bm', count > 0);
    });
  }

  function toggle(id) {
    const state = load();
    const willBeOn = !state[id];
    if (willBeOn) state[id] = true; else delete state[id];
    save(state);
    syncUI();
    if (typeof window.showToast === 'function') {
      window.showToast(willBeOn
        ? '⭐ Добавлено в закладки — смотрите «Закладки» в меню слева'
        : '✖ Убрано из закладок');
    }
  }

  /* ─── Горячая клавиша B — заложить текущий активный раздел ─── */
  document.addEventListener('keydown', e => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'b' || e.key === 'B' || e.key === 'и' || e.key === 'И') {
      const active = document.querySelector('nav.toc a.active');
      if (!active) return;
      const id = (active.getAttribute('href') || '').slice(1);
      if (id) { e.preventDefault(); toggle(id); }
    }
  });

  // Обновляем при открытии вкладки и при изменениях в других вкладках
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncUI();
  });
  window.addEventListener('storage', e => {
    if (e.key === KEY) syncUI();
  });

  syncUI();
})();
