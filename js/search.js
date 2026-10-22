/* Поиск: подсветка, счётчик (aria-live), [ ] навигация */

(() => {
  'use strict';

  const searchInput = document.getElementById('search');
  const mainContent = document.getElementById('content');
  if (!searchInput || !mainContent) return;

  let allMarks = [];
  let currentMarkIndex = -1;

  function getCounter() {
    let el = document.getElementById('searchCounter');
    if (!el) {
      el = document.createElement('div');
      el.id = 'searchCounter';
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-atomic', 'true');
      document.body.appendChild(el);
    }
    return el;
  }

  function positionCounter() {
    const el = getCounter();
    const header = document.querySelector('header');
    if (!header) return;
    const rect = header.getBoundingClientRect();
    el.style.top = (rect.bottom + 10) + 'px';
  }

  function updateCounter() {
    const el = getCounter();
    positionCounter();
    const q = searchInput.value.trim();

    // Счётчик показывается ТОЛЬКО когда в поле есть текст >= 2 символов
    if (q.length < 2) {
      el.textContent = '';
      return;
    }
    if (allMarks.length === 0) {
      el.textContent = 'Ничего не найдено';
      return;
    }
    el.textContent = currentMarkIndex >= 0
      ? `${currentMarkIndex + 1} из ${allMarks.length}`
      : `${allMarks.length} совпадений`;
  }

  function clearHighlights() {
    document.querySelectorAll('mark.hit').forEach(m => {
      const parent = m.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
    allMarks = [];
    currentMarkIndex = -1;
  }

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function doSearch(q) {
    clearHighlights();
    q = q.trim();

    if (q.length < 2) {
      updateCounter();
      return;
    }

    const re = new RegExp(escapeRegex(q), 'gi');
    const walker = document.createTreeWalker(
      mainContent,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentNode;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'MARK') {
            return NodeFilter.FILTER_REJECT;
          }
          if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);

    textNodes.forEach(node => {
      const txt = node.nodeValue;
      if (!re.test(txt)) return;
      re.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let last = 0, m;
      while ((m = re.exec(txt)) !== null) {
        if (m.index > last) {
          frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
        }
        const mark = document.createElement('mark');
        mark.className = 'hit';
        mark.textContent = m[0];
        frag.appendChild(mark);
        allMarks.push(mark);
        last = m.index + m[0].length;
      }
      if (last < txt.length) {
        frag.appendChild(document.createTextNode(txt.slice(last)));
      }
      node.parentNode.replaceChild(frag, node);
    });

    if (allMarks.length > 0) {
      currentMarkIndex = 0;
      allMarks[0].classList.add('current');
      allMarks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    updateCounter();
  }

  function goToMatch(dir) {
    if (!allMarks.length) return;
    allMarks[currentMarkIndex]?.classList.remove('current');
    currentMarkIndex = (currentMarkIndex + dir + allMarks.length) % allMarks.length;
    const mark = allMarks[currentMarkIndex];
    mark.classList.add('current');
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    updateCounter();
  }

  let dbId;
  searchInput.addEventListener('input', e => {
    clearTimeout(dbId);
    dbId = setTimeout(() => doSearch(e.target.value), 200);
  });

  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      goToMatch(e.shiftKey ? -1 : 1);
    }
  });

  /* При потере фокуса — если поле пустое, полностью очищаем подсветку */
  searchInput.addEventListener('blur', () => {
    if (!searchInput.value.trim()) {
      clearHighlights();
      updateCounter();
    }
  });

  window.addEventListener('resize', positionCounter, { passive: true });

  /* Публичный API для main.js */
  window.GuideSearch = {
    input: searchInput,
    goToMatch,
    clear() {
      searchInput.value = '';
      clearHighlights();
      updateCounter();
    },
    get hasMarks() { return allMarks.length > 0; },
    focus() { searchInput.focus(); searchInput.select(); },
  };
})();