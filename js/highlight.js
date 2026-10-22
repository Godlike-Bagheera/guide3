/* Подсветка синтаксиса кода (Highlight.js) — с подстройкой под тему сайта */
(function () {
  'use strict';

  // Локальные копии тем (atom-one) — подсветка синхронизируется с темой сайта.
  // Фон у .hljs сделан transparent: код живёт в фирменных «терминальных» блоках сайта (--bg-code).
  var LIGHT = 'css/hljs-light.css';
  var DARK = 'css/hljs-dark.css';
  var CDN = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/';
  var LANGS = ['bash', 'python', 'json', 'javascript', 'xml', 'ini', 'sql', 'nginx'];

  function isDarkTheme() {
    var t = document.documentElement.getAttribute('data-theme') || '';
    return t === 'dark' || t === 'rose-dark';
  }

  function setHljsTheme(href) {
    var link = document.getElementById('hljs-theme');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.id = 'hljs-theme';
      document.head.appendChild(link);
    }
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
  }

  function loadScript(src, onload, onerror) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    if (onload) s.onload = onload;
    if (onerror) s.onerror = onerror;
    document.head.appendChild(s);
    return s;
  }

  function highlightAll() {
    if (!window.hljs) return;
    document.querySelectorAll('pre code:not(.hljs-done)').forEach(function (el) {
      try { window.hljs.highlightElement(el); } catch (e) { /* пропускаем нестандартный блок */ }
      el.classList.add('hljs-done');
    });
  }

  function applyTheme() {
    setHljsTheme(isDarkTheme() ? DARK : LIGHT);
  }

  var highlighted = false;
  function runOnce() {
    if (highlighted) return;
    highlighted = true;
    highlightAll();
  }

  function init() {
    applyTheme();
    // следим за сменой темы (theme.js меняет атрибут data-theme на <html>)
    new MutationObserver(applyTheme).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    // Языковые файлы догружаем параллельно; регистрируем по готовности каждого.
    LANGS.forEach(function (lang) {
      loadScript(CDN + 'languages/' + lang + '.min.js', function () {
        var def = window['hljsDefine' + lang];
        if (!def || !window.hljs) return;
        try { window.hljs.registerLanguage(lang, def); } catch (e) { /* уже зарегистрирован */ }
        highlighted = false; // пересветить блоки новым языком
        highlightAll();
      });
    });

    loadScript(CDN + 'highlight.min.js', function () {
      highlighted = false;
      runOnce();
    }, function () {
      // CDN недоступен — сайт остаётся читаемым без подсветки
      console.warn('[hljs] не удалось загрузить highlight.js — показываем код без подсветки');
    });

    // Страховка: если скрипты загрузились, но колбэки не отработали
    setTimeout(function () { highlighted = false; highlightAll(); }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
