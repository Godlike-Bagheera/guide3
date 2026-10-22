/* Прогресс чтения + study-прогресс (без скрытия studyBar при 100%) */

(() => {
  'use strict';

  const readingBarFill = document.getElementById('readingBarFill');
  const markButtons = document.querySelectorAll('.mark-read');
  const trackLinks = document.querySelectorAll('nav.toc a[data-track]');
  // Ключ раздела: "id@страница" (после разбивки гайда) или чистый id.
  // Считаем и старые, и новые ключи, чтобы прогресс не потерялся.
  function sectionKeys(sec) {
    return sec.includes('@') ? [sec, sec.split('@')[0]] : [sec, sec + '@' + location.pathname.split('/').pop()];
  }
  function isDone(state, sec) { return sectionKeys(sec).some(k => !!state[k]); }
  const studyFill   = document.getElementById('studyFill');
  const studyDone   = document.getElementById('studyDone');
  const studyTotal  = document.getElementById('studyTotal');
  const studyIconPct = document.getElementById('studyIconPct');
  const studyReset  = document.getElementById('studyReset');
  const exportBtn   = document.getElementById('exportBtn');
  const studyBar    = document.getElementById('studyBar');

  // ОБЩИЙ прогресс по всему гайду, а не по текущей странице.
  // ВАЖНО: total должен быть ОДИНАКОВЫМ на всех страницах — иначе счётчик
  // «N из X» прыгает при переходе между страницами. Поэтому база одна и та
  // же везде: полный список реальных изучаемых разделов гайда
  // (window.GUIDE_SECTIONS — один и тот же массив, вшитый во все страницы).
  // Из него ИСКЛЮЧЕНЫ служебные якоря частей («part1», «part2», «intro-all»)
  // — они есть в карте id (js/idmap.js) для ссылок закладок, но это НЕ
  // разделы для отметки «изучено». Фолбэки (если GUIDE_SECTIONS почему-то
  // нет): кнопки текущей страницы → карта id минус служебные ключи.
  const SERVICE_IDS = ['intro-all', 'part1', 'part2'];
  // Фолбэк-копия списка разделов (синхронна с инлайн GUIDE_SECTIONS на всех
  // страницах). Нужна на случай, если инлайн-скрипт не выполнится до этого
  // файла — иначе счётчик «N из X» падал с ошибкой или показывал 0.
  const FALLBACK_SECTIONS = ["intro-all","prerequisites","architecture","intro","no-sudo","python","django","django-admin","django-bootstrap5","quickstart","shop","api","test-api","jsonplaceholder","deeper","nvm","react","proxy","react-code","jwt","test","run-all","git-intro","extended-model","auth-register","tests","env-config","db-schema","auth-compare","db-python","postgresql","deploy","cors-deep","troubleshooting","glossary","faq","cheatsheet","summary","export"];
  const TRACKED_IDS = new Set();
  const SECTIONS = Array.isArray(window.GUIDE_SECTIONS) && window.GUIDE_SECTIONS.length
    ? window.GUIDE_SECTIONS : FALLBACK_SECTIONS;
  SECTIONS.forEach(k => TRACKED_IDS.add(String(k).split('@')[0]));
  const TOTAL_SECTIONS = TRACKED_IDS.size;
  const total = TOTAL_SECTIONS;
  if (studyTotal) studyTotal.textContent = total;

  function loadState() {
    try { return JSON.parse(localStorage.getItem('studyProgress') || '{}'); }
    catch { return {}; }
  }
  function saveState(s) {
    try { localStorage.setItem('studyProgress', JSON.stringify(s)); } catch {}
  }

  function updateProgress() {
    const state = loadState();
    // Считаем ПОЛНЫЙ прогресс по всем страницам (общий для всего гайда),
    // а не только по кнопкам текущей страницы. Ключи в localStorage —
    // чистые id разделов; берём все, что есть в карте id или отмечены.
    const doneSet = new Set();
    Object.keys(state).forEach(k => {
      if (!state[k]) return;
      const pure = k.lastIndexOf('@') >= 0 ? k.slice(0, k.lastIndexOf('@')) : k;
      if (TRACKED_IDS.size && !TRACKED_IDS.has(pure)) return; // служебные/старые ключи не считаем
      if ((window.GUIDE_ID_MAP && pure in window.GUIDE_ID_MAP) || !window.GUIDE_ID_MAP) {
        doneSet.add(pure);
      }
    });
    markButtons.forEach(btn => {
      if (isDone(state, btn.dataset.section)) doneSet.add(btn.dataset.section.split('@')[0]);
    });
    const done = doneSet.size;
    const pct = total ? Math.min(100, Math.round(done / total * 100)) : 0;

    if (studyFill) studyFill.style.width = pct + '%';
    if (studyDone) studyDone.textContent = done;
    if (studyIconPct) studyIconPct.textContent = pct + '%';

    markButtons.forEach(btn => {
      const isBtnDone = isDone(state, btn.dataset.section);
      btn.classList.toggle('done', isBtnDone);
      btn.textContent = isBtnDone ? 'Изучено' : 'Отметить как изученное';
    });

    // НЕ скрываем — показываем поздравление
    if (studyBar) {
      studyBar.classList.toggle('complete', pct === 100 && done > 0);
    }
  }

  markButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const s = loadState();
      const key = btn.dataset.section;
      const on = !isDone(s, key);
      sectionKeys(key).forEach(k => { if (on) s[k] = true; else delete s[k]; });
      saveState(s);
      updateProgress();
      if (on && typeof window.showToast === 'function') {
        window.showToast('✅ Раздел отмечен');
      }
    });
  });

  if (studyReset) {
    studyReset.addEventListener('click', () => {
      if (confirm('Сбросить весь прогресс изучения?')) {
        try { localStorage.removeItem('studyProgress'); } catch {}
        updateProgress();
        if (typeof window.showToast === 'function') window.showToast('🔄 Прогресс сброшен');
      }
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const state = loadState();
      const data = {
        exported_at: new Date().toISOString(),
        progress: state,
        done: Object.values(state).filter(Boolean).length,
        total,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'study-progress.json';
      a.click();
      URL.revokeObjectURL(url);
      if (typeof window.showToast === 'function') window.showToast('📥 Прогресс скачан');
    });
  }

  updateProgress();

  /* ─── Кнопки «Отметить как изученное»: показывать только в дочитанном разделе ───
     По умолчанию кнопки скрыты (CSS: .mark-read { opacity:0; visibility:hidden }),
     чтобы при переходе по меню сверху не висел «хвост» чужого раздела.
     Появляются, когда пользователь докрутил до конца раздела (или уже отметил его). */
  const seenDone = new Set();
  if ('IntersectionObserver' in window) {
    const endObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const btn = e.target._markBtn;
        if (!btn) return;
        if (e.isIntersecting) {
          seenDone.add(btn);
          btn.classList.add('visible');
        }
      });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });
    // Ждём разметки от toc.js: разделы оборачиваются в <section id="X-sec">.
    window.addEventListener('load', () => {
      markButtons.forEach(btn => {
        const sec = document.getElementById(btn.dataset.section.split('@')[0] + '-sec')
                 || document.getElementById(btn.dataset.section.split('@')[0]);
        if (sec) { sec._markBtn = btn; endObs.observe(sec); }
        else { btn.classList.add('visible'); } // нет секции — показываем как раньше
      });
    }, { once: true });
  } else {
    markButtons.forEach(btn => btn.classList.add('visible'));
  }
  // Отмеченные разделы — кнопка видна всегда (можно снять отметку)
  const _origUpdate = updateProgress;
  window.updateProgressUI = function () {
    _origUpdate();
    const st = loadState();
    markButtons.forEach(btn => {
      if (isDone(st, btn.dataset.section)) btn.classList.add('visible');
    });
  };
  window.updateProgressUI();

  /* ─── Экспорт для объединённого scroll-хендлера ─── */
  window.updateReadingBar = () => {
    if (!readingBarFill) return;
    const h = document.documentElement;
    const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    readingBarFill.style.width = scrolled + '%';
  };

  window.updateProgressUI = updateProgress;
})();