/* Ctrl+B — два режима чтения:
   1) «С кодом» (по умолчанию): виден весь Python-код.
   2) «Без кода»: Python-код скрыт, вместо каждого блока показывается
      человеческое описание — что именно делать в этом месте шага. */

(() => {
  'use strict';

  const PY_LANGS = ['python', 'py', 'python3'];
  let hidden = false;

  /* Блоки кода, которые считаются «Python»:
     - span.lang-tag с текстом python (основной маркер в разметке гайда)
     - code.language-python / class="python" (если появится после hljs) */
  function isPythonBlock(pre) {
    const tag = pre.querySelector('.lang-tag');
    if (tag) {
      const t = (tag.textContent || '').trim().toLowerCase();
      if (PY_LANGS.includes(t)) return true;
    }
    const code = pre.querySelector('code');
    if (code) {
      const cls = (code.className || '').toLowerCase();
      if (/(^|\s)(language-)?(python3?|py)(\s|$)/.test(cls)) return true;
    }
    return false;
  }

  /* Найти рядом с <pre> блок-описание div[data-code-alt].
     Разметка: сразу после </pre> идёт <div class="code-desc" data-code-alt>.
     На всякий случай ищем и перед/pre — если описание стоит выше блока. */
  function findAltFor(pre) {
    let el = pre.nextElementSibling;
    while (el && el.tagName !== 'PRE') {
      if (el.hasAttribute && el.hasAttribute('data-code-alt')) return el;
      el = el.nextElementSibling;
    }
    el = pre.previousElementSibling;
    while (el && el.tagName !== 'PRE') {
      if (el.hasAttribute && el.hasAttribute('data-code-alt')) return el;
      el = el.previousElementSibling;
    }
    return null;
  }

  /* Один раз при загрузке: связываем описания с их блоками кода */
  const pairs = [];
  function collectPairs() {
    document.querySelectorAll('pre').forEach(pre => {
      if (!isPythonBlock(pre)) return;
      const alt = findAltFor(pre);
      pairs.push({ pre, alt });
    });
  }

  function apply(state) {
    pairs.forEach(({ pre, alt }) => {
      if (state) {
        pre.setAttribute('data-code-hidden', 'true');
        if (alt) alt.hidden = false;
      } else {
        pre.removeAttribute('data-code-hidden');
        if (alt) alt.hidden = true;
      }
    });
    document.documentElement.toggleAttribute('data-no-python', state);
  }

  function toggle() {
    hidden = !hidden;
    apply(hidden);
  }

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggle();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', collectPairs);
  } else {
    collectPairs();
  }

  console.log('%cCtrl+B — переключить режим: с Python-кодом / с пошаговыми объяснениями', 'color:#22c55e;');
})();
