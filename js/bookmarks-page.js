/* Страница «⭐ Закладки» (bookmarks.html): список сохранённых разделов.
   Данные читаются из localStorage, который пишет index.html (клавиша B). */

(() => {
  'use strict';

  const KEY = 'guide.bookmarks.v1';
  // Гайд разбит на страницы — страница раздела берётся из js/idmap.js
  // (window.GUIDE_ID_MAP), fallback — index.html.
  const GUIDE = 'index.html';

  function pageFor(id) {
    return (window.GUIDE_ID_MAP && window.GUIDE_ID_MAP[id]) || GUIDE;
  }
  function hrefFor(id) {
    return `${pageFor(id)}#${id}`;
  }

  // Миграция старых закладок: ключи могли сохраняться как "id@старая-страница"
  // или как "id@part1-django.html" после разбивки — приводим к чистому id,
  // иначе дубли в списке и рассинхрон со звёздочками.
  function normalize(s) {
    let changed = false;
    Object.keys(s).forEach(k => {
      if (k.includes('@')) {
        const pure = k.split('@')[0];
        delete s[k];
        s[pure] = true;
        changed = true;
      }
    });
    if (changed) save(s);
    return s;
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }

  // Название раздела берём из оглавления index.html — оно статично и не
  // зависит от загрузки самой страницы гайда.
  const TOC_TITLES = {
    'intro-all': "Введение",
    'prerequisites': "Prerequisites — что нужно знать до старта",
    'architecture': "Архитектура приложения",
    'part1': "Часть 1. Бэкенд на Django",
    'intro': "1. Введение в бэкенд",
    'no-sudo': "2. Почему без sudo и как это работает",
    'python': "3. Проверка Python и создание виртуального окружения",
    'django': "4. Создание Django-проекта",
    'django-admin': "5. Django Admin — готовая админка из коробки",
    'django-bootstrap5': "6. Django + Bootstrap 5 — django_bootstrap5",
    'quickstart': "6.5. Быстрый старт: Django + Bootstrap 5 за 8 шагов (config + webapp)",
    'shop': "6.6. Мини-интернет-магазин: товары, регистрация, вход и отзывы",
    'api': "7. Модель, сериализатор, представления",
    'test-api': "8. Тестирование API через curl",
    'jsonplaceholder': "9. JSONPlaceholder",
    'deeper': "10. Углубляемся: что такое DRF под капотом",
    'part2': "Часть 2. Фронтенд на React",
    'nvm': "11. Установка Node.js через nvm (без sudo)",
    'react': "12. Создание React-приложения",
    'proxy': "13. Настройка прокси Vite к Django API",
    'react-code': "14. Код React-приложения",
    'jwt': "15. Что такое JWT — разбор на примере jwt.io",
    'test': "16. Тестирование полного цикла",
    'run-all': "17. Запуск одним скриптом",
    'git-intro': "18. Git с самого начала",
    'extended-model': "19. Расширенная модель: теги и категории",
    'auth-register': "20. Регистрация пользователей",
    'tests': "21. Тесты Django",
    'env-config': "22. Переменные окружения (.env)",
    'db-schema': "23. Схема БД и жизненный цикл запроса",
    'auth-compare': "24. Аутентификация: сравнение подходов",
    'db-python': "25. База данных «на Python»: модели и миграции",
    'postgresql': "26. PostgreSQL — серьёзная база данных для продакшена",
    'deploy': "27. Деплой: выкладываем сайт в интернет",
    'cors-deep': "28. CORS глубоко: как браузер решает, кому можно ходить на ваш API",
    'troubleshooting': "29. Troubleshooting: типичные ошибки",
    'glossary': "30. Глоссарий",
    'faq': "31. FAQ — частые вопросы",
    'cheatsheet': "32. Cheat sheet — все команды в одном месте",
    'summary': "33. Итог",
    'export': "34. Экспорт гайда",
  };

  /* ─── Оглавление в сайдбаре (как на главной), со звёздочками-закладками ─── */
  const TOC_STRUCTURE = [
    { part: true, id: 'intro-all' },
    ['prerequisites', 'architecture'],
    { part: true, id: 'part1' },
    ['intro', 'no-sudo', 'python', 'django', 'django-admin', 'django-bootstrap5', 'quickstart', 'shop', 'api', 'test-api', 'jsonplaceholder', 'deeper'],
    { part: true, id: 'part2' },
    ['nvm', 'react', 'proxy', 'react-code', 'jwt', 'test', 'run-all'],
    { part: 'Продвинутое' },
    ['git-intro', 'extended-model', 'auth-register', 'tests', 'env-config', 'db-schema', 'auth-compare', 'db-python', 'postgresql', 'deploy', 'cors-deep'],
    { part: 'Справочник' },
    ['troubleshooting', 'glossary', 'faq', 'cheatsheet', 'summary', 'export'],
  ];

  function buildToc() {
    const ul = document.getElementById('bmToc');
    if (!ul) return;
    TOC_STRUCTURE.forEach(item => {
      const li = document.createElement('li');
      if (Array.isArray(item)) {
        item.forEach(id => li.appendChild(tocLink(id)));
      } else if (item.part === true) {
        li.appendChild(tocLink(item.id, true));
      } else {
        const span = document.createElement('span');
        span.className = 'toc-part';
        span.textContent = item.part;
        li.appendChild(span);
      }
      ul.appendChild(li);
    });
    syncStars();
  }

  function tocLink(id, isPart) {
    const a = document.createElement('a');
    a.href = hrefFor(id);
    if (isPart) a.className = 'toc-part';
    // Короткое имя: нумерация + первые слова, как в оглавлении гайда
    const full = TOC_TITLES[id] || id;
    const shortName = full.length > 26 ? full.slice(0, 24).trimEnd() + '…' : full;
    a.textContent = shortName;
    a.title = full;
    const star = document.createElement('span');
    star.className = 'bm-star';
    star.dataset.section = id;
    star.title = 'В закладки / убрать';
    star.setAttribute('role', 'button');
    star.setAttribute('tabindex', '0');
    star.setAttribute('aria-label', 'Добавить раздел в закладки');
    star.textContent = '☆';
    star.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      toggle(id);
    });
    star.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(id); }
    });
    a.appendChild(star);
    return a;
  }

  function toggle(id) {
    const s = load();
    const on = !s[id];
    if (on) s[id] = true; else delete s[id];
    save(s);
    syncStars();
    render();
    updateCounter();
    if (typeof window.showToast === 'function') {
      window.showToast(on ? `★ В закладках: ${TOC_TITLES[id] || id}` : '✖ Убрано из закладок');
    }
  }

  function syncStars() {
    const state = load();
    document.querySelectorAll('.bm-star').forEach(s => {
      const on = !!state[s.dataset.section];
      s.textContent = on ? '★' : '☆';
      s.classList.toggle('active', on);
    });
  }

  window.addEventListener('storage', () => { syncStars(); render(); updateCounter(); });

  const listEl = document.getElementById('bmPageList');
  const emptyEl = document.getElementById('bmPageEmpty');
  const countEl = document.getElementById('bmPageCount');
  const clearBtn = document.getElementById('bmPageClear');

  // Порядок отображения = порядок разделов в гайде
  const ORDER = Object.keys(TOC_TITLES);

  function render() {
    if (!listEl) return;
    const state = normalize(load());
    const ids = ORDER.filter(id => state[id]);

    if (countEl) countEl.textContent = ids.length ? String(ids.length) : '';
    if (emptyEl) emptyEl.hidden = ids.length !== 0;
    if (clearBtn) clearBtn.style.display = ids.length ? '' : 'none';
    updateCounter();

    listEl.innerHTML = '';
    ids.forEach(id => {
      const li = document.createElement('li');
      li.className = 'bm-item';

      const a = document.createElement('a');
      a.className = 'bm-title';
      a.href = hrefFor(id);
      a.textContent = TOC_TITLES[id] || id;
      li.appendChild(a);

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'bm-del';
      del.title = 'Удалить закладку';
      del.setAttribute('aria-label', 'Удалить закладку');
      del.textContent = '×';
      del.addEventListener('click', () => {
        const s = load();
        delete s[id];
        save(s);
        render();
        if (typeof window.showToast === 'function') {
          window.showToast('✖ Убрано из закладок');
        }
      });
      li.appendChild(del);

      listEl.appendChild(li);
    });
  }

  // Счётчик закладок в шапке/ссылке на страницу (обновляется при любом изменении)
  function updateCounter() {
    const n = Object.keys(load()).length;
    document.querySelectorAll('.bm-counter').forEach(el => {
      el.textContent = n ? String(n) : '';
    });
    document.querySelectorAll('a.bm-page-link').forEach(a => {
      a.classList.toggle('has-bm', n > 0);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      try { localStorage.removeItem(KEY); } catch {}
      render();
      syncStars();
      if (typeof window.showToast === 'function') {
        window.showToast('🗑 Закладки очищены');
      }
    });
  }

  buildToc();
  render();
})();
