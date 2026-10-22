/* TOC: scroll-spy (IntersectionObserver), smooth-scroll, назад/далее */

(() => {
  'use strict';

  // Согласовано с CSS: html { scroll-padding-top: 120px; }
  const SCROLL_OFFSET = 110;

  const tocLinks = document.querySelectorAll('nav.toc a[href^="#"]');
  const sections = [...tocLinks]
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  /* ─── Scroll-spy через IntersectionObserver ─── */
  let activeId = null;

  function setActive(id) {
    if (!id || activeId === id) return;
    activeId = id;
    tocLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id);
    });
    if (typeof updateDock === 'function') updateDock(); // фаза 1: до объявления — typeof безопасен, no-op
  }

  const spy = new IntersectionObserver(entries => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => a.target.offsetTop - b.target.offsetTop);
    if (visible.length) setActive(visible[0].target.id);
  }, { rootMargin: '-120px 0px -70% 0px', threshold: 0 });

  sections.forEach(s => { if (s.id) spy.observe(s); });

  /* ─── Инициализация ─── */
  function initActive() {
    if (window.scrollY > 100) return;
    const firstSec = sections.find(s => s.id);
    if (firstSec) setActive(firstSec.id);
  }

  /* ─── Плавный скролл по клику в меню ─── */
  // Скроллим к НАЧАЛУ раздела (секции <section id="X-sec">), а не к id
  // заголовка — иначе сверху под шапкой оставался «хвост» предыдущего
  // раздела с кнопкой «Отметить как изученное».
  function scrollToSection(id) {
    const target = document.getElementById(id + '-sec') || document.getElementById(id);
    if (!target) return false;
    window.scrollTo({
      top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET),
      behavior: 'smooth'
    });
    setActive(id);
    return true;
  }

  tocLinks.forEach(a => {
    a.addEventListener('click', e => {
      if (a.classList.contains('toc-part')) return; // групповой заголовок — обычная ссылка
      if (scrollToSection(a.getAttribute('href').slice(1))) {
        e.preventDefault();
        history.replaceState(null, '', a.getAttribute('href'));
      }
    });
  });

  /* ─── Точный переход при открытии страницы с якорем (part2-react.html#jwt,
         прямая ссылка, «Назад» браузера). Браузер при загрузке скроллит к id
         заголовка сам — и сверху остаётся «хвост» предыдущего раздела. Поэтому
         отключаем восстановление скролла и перескролливаем сами к НАЧАЛУ
         секции этого раздела. ─── */
  history.scrollRestoration = 'manual';
  function jumpToHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    scrollToSection(id);
  }
  window.addEventListener('hashchange', jumpToHash);

  /* ─── Полоска под h2/h3 ровно по ширине текста заголовка ─── */
  // Оборачиваем содержимое заголовка в inline-блок; ::after span'а рисует
  // полоску длиной ровно со слово (см. css/base.css).
  document.querySelectorAll('main h2[id]').forEach(h => {
    if (h.querySelector(':scope > .h2-line')) return;
    const span = document.createElement('span');
    span.className = 'h2-line';
    while (h.firstChild) span.appendChild(h.firstChild);
    h.appendChild(span);
  });
  document.querySelectorAll('main h3[id]').forEach(h => {
    if (h.querySelector(':scope > .h3-line')) return;
    const span = document.createElement('span');
    span.className = 'h3-line';
    while (h.firstChild) span.appendChild(h.firstChild);
    h.appendChild(span);
  });

  // Порядок разделов = порядок ссылок в оглавлении; заголовки берём по href.
  const orderedSections = [...new Set(
    [...tocLinks]
      .map(a => document.querySelector(a.getAttribute('href')))
      .filter(Boolean)
  )];
  const orderedSet = new Set(orderedSections.map(h => h.id));

  /* ─── Разбивка на <section> и скролл к НАЧАЛУ раздела ───
     Кнопка «Отметить как изученное» лежит в конце ПРЕДЫДУЩЕГО раздела — когда
     браузер скроллит к id заголовка, она остаётся видимой над ним («хвост»
     чужого раздела сверху). Поэтому:
       1) каждый раздел оборачиваем в <section id="X-sec"> (от заголовка до
          конца раздела) — кнопка живёт внутри своей секции;
       2) все переходы идут через scrollToSection()/goTo(), которые скроллят
          к началу секции: сразу под шапкой виден ровно заголовок выбранного
          пункта. */
  function wrapSections(list) {
    list.forEach((h, i) => {
      if (!h.id || h.closest('section')) return; // уже обёрнуто
      const parent = h.parentNode;
      const sec = document.createElement('section');
      sec.id = h.id + '-sec';
      parent.insertBefore(sec, h);
      // Границы секции: любой следующий заголовок с id из порядка оглавления
      // (в т.ч. h3-подраздел внутри h2-секции — он сам станет своей секцией),
      // либо nav.toc / <hr class="part-sep"> — структурные разделители страниц.
      // Раньше границей считался только заголовок из того же списка и только
      // с тем же родителем — из-за этого в секцию затягивало соседние блоки
      // («хвост» чужого раздела сверху при переходе по меню).
      const isBoundary = n => {
        if (n.nodeType !== 1) return false;
        if (/^H[23]$/.test(n.tagName) && n.id && orderedSet.has(n.id)) return true;
        // Дочерние заголовки без id (например «Минимальные требования» внутри
        // блока .prereq) НЕ являются границами — они остаются в своём разделе.
        if (n.classList && (n.classList.contains('toc') || n.matches('nav.toc'))) return true;
        if (n.tagName === 'HR') return true;
        return false;
      };
      let node = h.nextSibling;
      sec.appendChild(h);
      while (node && !isBoundary(node)) {
        const move = node;
        node = node.nextSibling;
        sec.appendChild(move);
      }
    });
  }
  wrapSections(orderedSections.filter(h => h.tagName === 'H3'));
  wrapSections(orderedSections.filter(h => h.tagName === 'H2'));

  /* ─── «Назад / Далее» как плавающая панель УБРАНА полностью ───
     Она вставлялась под заголовок активного раздела и при переходах между
     пунктами разных частей выглядела как прилипший блок с чужими названиями.
     Навигация между разделами: дерево TOC слева + J/K (GuideTOC ниже). */

  function goTo(target) {
    // Скроллим к НАЧАЛУ раздела (секции), а не к id заголовка — иначе сверху
    // под шапкой оставался «хвост» предыдущего раздела с кнопкой «Отметить».
    const sec = document.getElementById(target.id + '-sec');
    const t = sec || target;
    window.scrollTo({
      top: Math.max(0, t.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET),
      behavior: 'smooth'
    });
    setActive(target.id);
    history.replaceState(null, '', '#' + target.id);
  }

  /* ─── Публичный API для main.js (J/K навигация) ─── */
  window.GuideTOC = {
    next() {
      const idx = orderedSections.findIndex(s => s.id === activeId);
      const next = orderedSections[Math.min(idx + 1, orderedSections.length - 1)];
      if (next) goTo(next);
    },
    prev() {
      const idx = orderedSections.findIndex(s => s.id === activeId);
      const prev = orderedSections[Math.max(idx - 1, 0)];
      if (prev) goTo(prev);
    },
  };
})();