/* Два режима чтения гайда (переключается по Ctrl+B):
   1) «С кодом» (по умолчанию): виден весь код.
   2) «Без кода»: скрывается ТОЛЬКО код файлов проекта — блоки Python и
      HTML-шаблоны (в том числе python/html-файлы раздела 34). Вместо каждого
      показывается человеческое описание — что именно делать на этом шаге.
      Команды терминала (bash) и прочие блоки (env/ini/nginx/sql/json/text/
      jsx/javascript) остаются видимыми ВСЕГДА — по ним новичок и идёт по
      гайду, включая раздел 34: там в режиме «без кода» видно все команды и
      карточки-подсказки вместо файлов.
   Выбранный режим запоминается в localStorage и восстанавливается на
   всех страницах сайта. */

(() => {
  'use strict';

  const STORAGE_KEY = 'guide-no-code';
  /* Что считается «код файлов проекта», который можно убрать: */
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
    /* режим «без кода» — атрибут на <html>: по нему CSS показывает
       карточки-подсказки .commands-only в разделе 34 */
    if (state) {
      document.documentElement.setAttribute('data-no-python', '');
    } else {
      document.documentElement.removeAttribute('data-no-python');
    }
    /* подсказка внутри раздела 34: только в режиме «без кода» */
    document.querySelectorAll('.commands-only').forEach(el => { el.hidden = !state; });

    /* Раздел 34 («Простая последовательность команд») целиком — это код,
       поэтому в режиме «без кода» он полностью скрывается: и сам раздел на
       странице, и его пункт в левой панели навигации (на всех страницах).
       В режиме «с кодом» — возвращается на место. */
    const sec = document.getElementById('commands-section');
    const wasInView = sec && !sec.hidden && (() => {
      try { return sec.getBoundingClientRect().top < innerHeight && sec.getBoundingClientRect().bottom > 0; }
      catch (e) { return false; }
    })();
    if (sec) sec.hidden = state;
    document.querySelectorAll('a[href="#commands"], a[href*="reference.html#commands"]')
      .forEach(a => { const li = a.closest('li'); if (li) li.hidden = state; });

    /* Если пользователь смотрел на раздел 34 и включил режим «без кода» —
       прокручиваем страницу в самое начало, чтобы не остаться посреди пустоты. */
    if (state && wasInView) {
      try {
        history.replaceState(null, '', location.pathname + location.search);
      } catch (e) { location.hash = ''; }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    try { localStorage.setItem(STORAGE_KEY, state ? '1' : '0'); } catch (e) {}
  }

  function toggle() {
    hidden = !hidden;
    apply(hidden);
  }

  function init() {
    collectPairs();

    /* восстановить сохранённый режим */
    let saved = '0';
    try { saved = localStorage.getItem(STORAGE_KEY) || '0'; } catch (e) {}
    hidden = saved === '1';
    apply(hidden);

    /* Ctrl+B / Cmd+B — переключатель режима */
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
