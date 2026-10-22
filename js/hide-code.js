/* Ctrl+B — скрыть / вернуть обратно весь Python-код на странице */

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

  function apply(state) {
    document.querySelectorAll('pre').forEach(pre => {
      if (!isPythonBlock(pre)) return;
      if (state) {
        pre.setAttribute('data-code-hidden', 'true');
      } else {
        pre.removeAttribute('data-code-hidden');
      }
    });
  }

  function toggle() {
    hidden = !hidden;
    apply(hidden);
    if (typeof window.showToast === 'function') {
      window.showToast(hidden
        ? '🐍 Python-код скрыт — Ctrl+B, чтобы вернуть'
        : '🐍 Python-код снова виден');
    }
  }

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggle();
    }
  });

  console.log('%cCtrl+B — скрыть/показать весь Python-код', 'color:#22c55e;');
})();
