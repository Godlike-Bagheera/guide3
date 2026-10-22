/* UI: toast, copy, reveal, FAQ, modal, tooltips для команд */

(() => {
  'use strict';

  /* ═══════════ SAFETY PATCH: type="button" ═══════════ */
  /* Дефолтный type у <button> — "submit". Если кнопка когда-нибудь
     окажется внутри <form>, она начнёт сабмитить. Проставляем явно. */
  document.querySelectorAll('button:not([type])').forEach(b => {
    b.setAttribute('type', 'button');
  });

  /* ═══════════ TOAST ═══════════ */
  const toast = document.getElementById('toast');
  let toastTimeout;
  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2200);
  }
  window.showToast = showToast;

  /* ═══════════ COPY BUTTONS ═══════════ */
  document.querySelectorAll('pre').forEach(pre => {
    const btn = pre.querySelector('.copy-btn');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.innerText ?? '';
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = 'Скопировано';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Копировать';
          btn.classList.remove('copied');
        }, 1500);
      } catch {
        btn.textContent = 'Ошибка';
      }
    });
  });

  /* ═══════════ REVEAL ═══════════ */
  const revealTargets = document.querySelectorAll(
    'main > h2, main > h3, main > h4, main > pre, main > blockquote, main > table, ' +
    'main > .callout, main > .card-grid, main > .faq, main > .welcome, main > .prereq, ' +
    'main > .arch, main > .table-wrap'
  );
  revealTargets.forEach(el => el.classList.add('reveal'));

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.05 });
  revealTargets.forEach(el => io.observe(el));

  /* ═══════════ FAQ + a11y ═══════════ */
  document.querySelectorAll('.faq-item').forEach((item, i) => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    if (!q || !a) return;

    // Связываем кнопку и панель для скринридеров
    const btnId = q.id || `faq-btn-${i + 1}`;
    const panelId = a.id || `faq-panel-${i + 1}`;
    q.id = btnId;
    a.id = panelId;
    q.setAttribute('aria-controls', panelId);
    a.setAttribute('role', 'region');
    a.setAttribute('aria-labelledby', btnId);
    a.setAttribute('aria-hidden', 'true');

    q.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(other => {
        other.classList.remove('open');
        const otherBtn = other.querySelector('.faq-q');
        const otherPanel = other.querySelector('.faq-a');
        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        if (otherPanel) otherPanel.setAttribute('aria-hidden', 'true');
      });
      if (!wasOpen) {
        item.classList.add('open');
        q.setAttribute('aria-expanded', 'true');
        a.setAttribute('aria-hidden', 'false');
      }
    });
  });

  /* ═══════════ MODALS ═══════════ */
  let lastFocused = null;

  function openModal(overlay) {
    if (!overlay) return;
    lastFocused = document.activeElement;
    overlay.classList.add('show');
    const focusable = overlay.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) focusable.focus();
  }

  function closeModal(overlay) {
    if (!overlay) return;
    overlay.classList.remove('show');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay);
    });
    const closeBtn = overlay.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal(overlay));

    overlay.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const focusables = overlay.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  });

  window.GuideModal = { open: openModal, close: closeModal };

  /* ═══════════ TOOLTIPS ДЛЯ КОМАНД И ТЕРМИНОВ ═══════════ */

  const COMMAND_TIPS = {
    /* ─── Файловая система ─── */
    'cd':        'Change Directory — сменить текущую директорию. Пример: cd ~/projects',
    'ls':        'List — показать содержимое папки. Флаги: -l (подробно), -a (включая скрытые)',
    'mkdir':     'Make Directory — создать папку. Пример: mkdir -p ~/projects/app',
    'cat':       'Concatenate — вывести содержимое файла в терминал. Пример: cat requirements.txt',
    'pwd':       'Print Working Directory — показать полный путь к текущей папке',
    'nano':      'Простой консольный текстовый редактор. Ctrl+O — сохранить, Ctrl+X — выйти',
    'rm':        'Remove — удалить файл. rm -rf удаляет папку рекурсивно (осторожно!)',
    'cp':        'Copy — скопировать файл или папку. Пример: cp a.txt b.txt',
    'mv':        'Move — переместить или переименовать. Пример: mv old.txt new.txt',
    'echo':      'Вывести текст или переменную на экран. Пример: echo $PATH',
    'touch':     'Создать пустой файл. Пример: touch new.txt',
    'find':      'Поиск файлов в файловой системе. Пример: find . -name "*.py"',
    'grep':      'Поиск текста по файлам или в потоке. Пример: ps aux | grep python',
    'df':        'Disk Free — показать свободное место на дисках',
    'du':        'Disk Usage — размер директорий. Пример: du -sh *',
    'ps':        'Process Status — список процессов. ps aux | grep python',
    'top':       'Мониторинг процессов и нагрузки в реальном времени',
    'htop':      'Улучшенная версия top с интерактивным интерфейсом',
    'kill':      'Убить процесс по PID. Пример: kill 1234',
    'pkill':     'Kill by name — убить процесс по имени. Пример: pkill -f runserver',
    'chmod':     'Change Mode — изменить права доступа к файлу',
    'man':       'Manual — встроенная документация по команде. Пример: man ls',
    'source':    'Выполнить скрипт в текущей оболочке (а не в подоболочке)',
    'export':    'Задать переменную окружения. Пример: export TOKEN=abc',

    /* ─── Система ─── */
    'sudo':      'SuperUser DO — выполнить команду с правами администратора',
    'dnf':       'Dandified YUM — пакетный менеджер RPM-дистрибутивов (РЕД ОС, Fedora)',
    'apt':       'Пакетный менеджер Debian/Ubuntu',
    'systemctl': 'Управление systemd-сервисами: start, stop, status, enable',

    /* ─── Python ─── */
    'python3':   'Интерпретатор Python 3',
    'python':    'Интерпретатор Python (может указывать на 2.x или 3.x)',
    'pip':       'Package Installer for Python — устанавливает Python-пакеты',
    'venv':      'Virtual ENVironment — изолированное окружение Python-пакетов',
    'deactivate':'Выйти из активированного виртуального окружения',
    'pytest':    'Фреймворк для тестирования Python',

    /* ─── Django ─── */
    'django-admin': 'CLI-утилита Django. django-admin startproject — создать проект',
    'manage.py':    'Скрипт управления Django-проектом: runserver, migrate, shell…',

    /* ─── Node / React ─── */
    'nvm':       'Node Version Manager — управление версиями Node.js без sudo',
    'npm':       'Node Package Manager — установка и управление пакетами Node.js',
    'node':      'Интерпретатор Node.js',
    'npx':       'Запуск npm-пакета без глобальной установки',
    'vite':      'Современный сборщик фронтенда и dev-сервер',
    'react':     'JavaScript-библиотека для пользовательских интерфейсов',
    'axios':     'HTTP-клиент для JavaScript с поддержкой интерцепторов',

    /* ─── Сеть ─── */
    'curl':      'HTTP-запросы из терминала. -X POST, -H "…", -d "{…}"',
    'wget':      'Загрузка файлов из интернета. Пример: wget https://example.com/file.zip',
    'ssh':       'Secure Shell — подключение к удалённому серверу. ssh user@host',
    'scp':       'Secure Copy — копирование файлов по SSH',
    'tar':       'Архиватор. tar -xzf archive.tar.gz — распаковать',
    'zip':       'Упаковать файлы в zip-архив',
    'unzip':     'Распаковать zip-архив',

    /* ─── Git ─── */
    'git':       'Система контроля версий. Основные команды: init, add, commit, push, pull',

    /* ═══════════ HTTP-МЕТОДЫ ═══════════ */
    'get':       'HTTP GET — получить данные. Идемпотентный, тело ответа необязательно',
    'post':      'HTTP POST — создать ресурс. С телом запроса, не идемпотентный',
    'put':       'HTTP PUT — полностью заменить ресурс новым содержимым',
    'patch':     'HTTP PATCH — частично обновить ресурс (только переданные поля)',
    'delete':    'HTTP DELETE — удалить ресурс',
    'options':   'HTTP OPTIONS — узнать доступные методы. Используется в CORS preflight',
    'head':      'HTTP HEAD — как GET, но без тела ответа (только заголовки)',
    'put/patch': 'HTTP PUT/PATCH — PUT заменяет ресурс целиком, PATCH — частично',

    /* ═══════════ JWT / AUTH ═══════════ */
    'jwt':           'JSON Web Token — самодостаточный токен с подписью. Состоит из header.payload.signature',
    'access_token':  'Access Token — короткоживущий JWT (5–60 мин) для авторизации запросов',
    'refresh_token': 'Refresh Token — долгоживущий JWT (7–30 дней) для обновления access-токена',
    'csrf_token':    'CSRF Token — защита от межсайтовой подделки запросов. Double-submit cookie',
    'bearer':        'Bearer — схема авторизации: Authorization: Bearer <token>',
    'authorization': 'HTTP-заголовок с учётными данными: Authorization: Bearer <token>',
    'token':         'Токен — строка-удостоверение, подтверждающая, что запрос авторизован',
    'cookie':        'Cookie — небольшой фрагмент данных в браузере, отправляется с каждым запросом',
    'httponly':      'httpOnly — флаг cookie: JS не может прочитать, защита от XSS',
    'samesite':      'SameSite — флаг cookie: Strict, Lax или None. Защита от CSRF',
    'xss':           'XSS — Cross-Site Scripting, внедрение чужого JS на страницу',
    'csrf':          'CSRF — Cross-Site Request Forgery, подделка запроса от имени пользователя',

    /* ═══════════ WEB STORAGE ═══════════ */
    'localstorage':   'Web Storage API — постоянное хранилище в браузере (~5 МБ, живёт до очистки)',
    'sessionstorage': 'Web Storage API — хранилище на время сессии вкладки, очищается при закрытии',

    /* ═══════════ ВЕБ-ТЕРМИНЫ ═══════════ */
    'http':      'HyperText Transfer Protocol — протокол передачи данных в вебе',
    'https':     'HTTP поверх TLS-шифрования. Обязателен для продакшена',
    'rest':      'REST — архитектурный стиль API на основе HTTP-методов и ресурсов',
    'api':       'API — программный интерфейс для взаимодействия сервисов',
    'json':      'JSON — текстовый формат обмена данными. { "key": "value" }',
    'cors':      'CORS — правила, разрешающие или запрещающие cross-origin запросы',
    'orm':       'ORM — Object-Relational Mapping: Python-классы ↔ SQL-таблицы',
    'spa':       'SPA — Single Page Application, одностраничное приложение',
    'crud':      'CRUD — Create, Read, Update, Delete. Четыре базовые операции',
    'middleware': 'Middleware — прослойка обработки запроса между сервером и view',
    'endpoint':  'Endpoint — конкретный URL API, на который шлют запросы',
    'payload':   'Payload — «полезная нагрузка», тело запроса/ответа или данные токена',
    'header':    'Header — HTTP-заголовок с метаданными запроса/ответа',
    'render':    'Render — отрисовка интерфейса (HTML/DOM) браузером',
    'devtools':  'DevTools — инструменты разработчика в браузере (открываются по F12)',
    'npmjs':     'npmjs.com — публичный реестр пакетов Node.js',

    /* ═══════════ БД ═══════════ */
    'sqlite':    'SQLite — встраиваемая файловая СУБД, по умолчанию в Django',
    'postgresql':'PostgreSQL — мощная реляционная СУБД для продакшена',
    'migration': 'Миграция — файл с описанием изменений схемы БД',
    'queryset':  'QuerySet — ленивый запрос к БД в Django ORM',

    /* ═══════════ ENV ═══════════ */
    'path':      'PATH — переменная окружения со списком папок для поиска исполняемых файлов',
    'bashrc':    '.bashrc — файл настроек bash, выполняется при запуске каждого терминала',
    'env':       '.env — файл с переменными окружения (секреты, ключи, настройки)',
    'debug':     'DEBUG — режим отладки Django. В продакшене обязательно False',
  };

  /* Порядок важен: специфичные фразы должны идти ВЫШЕ общих,
     потому что поиск идёт через startsWith() и останавливается
     на первом совпадении. */
  const PHRASE_TIPS = {
    /* ── Python manage.py — специфичные первыми ── */
    'python manage.py runserver':       'Запустить dev-сервер Django (по умолчанию :8000)',
    'python manage.py migrate':         'Применить миграции к базе данных',
    'python manage.py makemigrations':  'Создать миграции из изменённых моделей',
    'python manage.py createsuperuser': 'Создать администратора Django',
    'python manage.py shell':           'Открыть интерактивную консоль с настройками Django',
    'python manage.py':                 'Скрипт управления Django-проектом',

    /* ── Git ── */
    'git init':    'Создать новый git-репозиторий в текущей папке',
    'git status':  'Показать, что изменилось с последнего коммита',
    'git add':     'Добавить файлы в индекс (staging area)',
    'git commit':  'Зафиксировать изменения. Флаг -m "…" задаёт сообщение',
    'git push':    'Отправить коммиты в удалённый репозиторий',
    'git pull':    'Забрать изменения из удалённого репозитория',
    'git log':     'История коммитов. --oneline — компактный вид',
    'git diff':    'Построчная разница между версиями файлов',
    'git clone':   'Склонировать удалённый репозиторий локально',
    'git branch':  'Показать или создать ветки',
    'git checkout':'Переключиться на другую ветку или коммит',
    'git merge':   'Слить другую ветку в текущую',

    /* ── npm ── */
    'npm install': 'Установить зависимости из package.json',
    'npm run dev': 'Запустить dev-скрипт из package.json (обычно Vite)',
    'npm run build':'Собрать прод-версию фронтенда',

    /* ── venv / pip ── */
    'source venv/bin/activate': 'Активировать виртуальное окружение Python',
    'pip install': 'Установить Python-пакет через pip',
    'pip freeze':  'Вывести список установленных пакетов (для requirements.txt)',

    /* ── Django ORM ── */
    'from django.db import models': 'Импорт базовых классов моделей Django',
    'on_delete':      'on_delete — поведение при удалении связанного объекта (CASCADE, SET_NULL…)',
    'related_name':   'related_name — имя обратной связи для ForeignKey',
    'auto_now_add':   'auto_now_add — автозаполнение даты при создании объекта',
    'auto_now':       'auto_now — автозаполнение даты при каждом сохранении',
    'select_related': 'select_related — оптимизация ORM: JOIN для ForeignKey',
    'prefetch_related':'prefetch_related — оптимизация ORM: отдельный запрос для M2M',
  };

  function initTooltips() {
    const tooltip = document.createElement('div');
    tooltip.id = 'tooltip';
    tooltip.setAttribute('role', 'tooltip');
    document.body.appendChild(tooltip);

    let showTimer = null;
    let currentTarget = null;

    function position(el) {
      const rect = el.getBoundingClientRect();
      const tw = tooltip.offsetWidth;
      const th = tooltip.offsetHeight;
      let left = rect.left + rect.width / 2 - tw / 2;
      let top = rect.top - th - 10;
      let below = false;

      if (top < 8) {
        top = rect.bottom + 10;
        below = true;
      }
      left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));

      tooltip.style.left = left + 'px';
      tooltip.style.top  = top  + 'px';
      tooltip.classList.toggle('below', below);
    }

    function show(el, text) {
      currentTarget = el;
      tooltip.textContent = text;
      tooltip.style.visibility = 'hidden';
      tooltip.classList.add('show');
      position(el);
      tooltip.style.visibility = '';
    }

    function hide() {
      currentTarget = null;
      tooltip.classList.remove('show');
    }

    /* Обогащаем <code> вне блоков кода */
    document.querySelectorAll('code').forEach(code => {
      if (code.closest('pre')) return;
      const raw = code.textContent.trim();
      if (!raw) return;
      const lower = raw.toLowerCase();

      /* 1. Фразы (могут идти с продолжением через пробел, точку, скобку или слэш) */
      for (const phrase of Object.keys(PHRASE_TIPS)) {
        if (
          lower === phrase ||
          lower.startsWith(phrase + ' ') ||
          lower.startsWith(phrase + '(') ||
          lower.startsWith(phrase + '/')
        ) {
          code.dataset.tooltip = PHRASE_TIPS[phrase];
          code.classList.add('has-tip');
          return;
        }
      }

      /* 2. Только для строк без пробелов */
      if (!/\s/.test(raw)) {
        // точное совпадение
        if (COMMAND_TIPS[lower]) {
          code.dataset.tooltip = COMMAND_TIPS[lower];
          code.classList.add('has-tip');
          return;
        }
        // отрезаем хвост вида ".method()" или ":..." — берём первое слово
        const head = raw.split(/[.(:/\[]/)[0].toLowerCase();
        if (head && head !== lower && COMMAND_TIPS[head]) {
          code.dataset.tooltip = COMMAND_TIPS[head];
          code.classList.add('has-tip');
        }
      }
    });

    document.addEventListener('mouseover', e => {
      const target = e.target.closest('[data-tooltip]');
      if (!target || target === currentTarget) return;
      clearTimeout(showTimer);
      showTimer = setTimeout(() => show(target, target.dataset.tooltip), 120);
    });

    document.addEventListener('mouseout', e => {
      const target = e.target.closest('[data-tooltip]');
      if (target && target === currentTarget) {
        clearTimeout(showTimer);
        hide();
      }
    });

    document.addEventListener('touchstart', e => {
      const target = e.target.closest('[data-tooltip]');
      if (!target) { hide(); return; }
      clearTimeout(showTimer);
      show(target, target.dataset.tooltip);
      setTimeout(hide, 3500);
    }, { passive: true });

    document.addEventListener('focusin', e => {
      const target = e.target.closest('[data-tooltip]');
      if (target) show(target, target.dataset.tooltip);
    });
    document.addEventListener('focusout', () => hide());

    window.addEventListener('scroll', () => {
      if (currentTarget) hide();
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (currentTarget) position(currentTarget);
    }, { passive: true });
  }

  initTooltips();
})();