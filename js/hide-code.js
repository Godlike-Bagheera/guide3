/* Два режима чтения гайда (переключаются кнопкой «</>» в шапке или Ctrl+B):
   1) «С кодом» (по умолчанию): виден весь код.
   2) «Без кода»: блоки Python и HTML-шаблонов скрываются, вместо каждого
      показывается человеческое описание — что именно делать на этом шаге.
   Команды терминала (bash/env/ini/nginx/sql/json/text/jsx/javascript)
   остаются видимыми ВСЕГДА — по ним новичок и идёт по гайду.
   Раздел 34 («Простая последовательность команд») целиком состоит из
   файлов проекта, поэтому в режиме «без кода» он скрывается полностью,
   а страница прокручивается к началу («1. Введение в бэкенд»).
   Выбранный режим запоминается в localStorage и восстанавливается на
   всех страницах сайта. */

(() => {
  'use strict';

  const STORAGE_KEY = 'guide-no-code';
  /* Что считается «код, который можно убрать», пряча Python-часть гайда: */
  const HIDE_LANGS = ['python', 'py', 'python3', 'html', 'django'];
  let hidden = false;

  function blockLang(pre) {
    const tag = pre.querySelector('.lang-tag');
    if (tag) return (tag.textContent || '').trim().toLowerCase();
    const code = pre.querySelector('code');
    if (code) {
      const m = (code.className || '').match(/(?:language-)?(python3?|py|html|django)/);
      if (m) return m[1].toLowerCase() === 'py' ? 'python' : m[1].toLowerCase();
    }
    return '';
  }

  function isHideable(pre) {
    return HIDE_LANGS.includes(blockLang(pre));
  }

  /* Разметка: сразу после </pre> идёт <div class="code-desc" data-code-alt>.
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
      el = el.nextElementSibling;
    }
    return null;
  }

  const pairs = [];
  function collectPairs() {
    document.querySelectorAll('pre').forEach(pre => {
      const lang = blockLang(pre);
      /* Бейдж «Терминал» у блоков с командами — их нельзя скрыть,
         и новичку важно видеть, что это выполняется в консоли. */
      if (lang === 'bash') pre.setAttribute('data-lang-badge', 'bash');
      if (!isHideable(pre)) return;
      pairs.push({ pre, alt: findAltFor(pre) });
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
    /* режим «без кода» — атрибут на <html>: CSS прячет раздел 34 целиком */
    if (state) {
      document.documentElement.setAttribute('data-no-python', '');
    } else {
      document.documentElement.removeAttribute('data-no-python');
    }
    /* подсказка внутри раздела 34: только в режиме «без кода» */
    document.querySelectorAll('.commands-only').forEach(el => { el.hidden = !state; });
    /* визуальная кнопка-переключатель в шапке */
    const btn = document.getElementById('codeToggleBtn');
    if (btn) {
      btn.classList.toggle('active', state);
      btn.setAttribute('aria-pressed', state ? 'true' : 'false');
      btn.title = state
        ? 'Показать код (Ctrl+B)'
        : 'Скрыть код и показать пошаговые объяснения (Ctrl+B)';
    }
    try { localStorage.setItem(STORAGE_KEY, state ? '1' : '0'); } catch (e) {}
  }

  function toggle() {
    const wasHidden = hidden;
    hidden = !hidden;
    apply(hidden);

    /* Если пользователь смотрел раздел 34 и включил режим «без кода» —
       раздел скрыт целиком, перематываем страницу в самое начало
       (раздел «1. Введение в бэкенд»). */
    if (!wasHidden && hidden) {
      const sec = document.getElementById('commands-section');
      if (sec) {
        const r = sec.getBoundingClientRect();
        const inView = r.top < window.innerHeight && r.bottom > 0;
        const hash = location.hash || '';
        if (inView || /^#(cmd-|commands)/.test(hash)) {
          try { history.replaceState(null, '', location.pathname); } catch (e) {}
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }
  }

  function init() {
    collectPairs();

    /* восстановить сохранённый режим */
    let saved = '0';
    try { saved = localStorage.getItem(STORAGE_KEY) || '0'; } catch (e) {}
    hidden = saved === '1';
    apply(hidden);

    /* кнопка в шапке — основной способ переключения */
    const btn = document.getElementById('codeToggleBtn');
    if (btn) {
      btn.addEventListener('click', toggle);
    }

    /* Ctrl+B / Cmd+B — тот же переключатель */
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggle();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
