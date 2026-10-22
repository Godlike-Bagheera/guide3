/* Тема + шрифт + автотема + анти-лаг при switch */

(() => {
  'use strict';

  const html = document.documentElement;
  const metaTheme = document.getElementById('metaThemeColor');

  const THEME_COLORS = {
    'rose':      '#fdf2f6',
    'rose-dark': '#14060d',
    'light':     '#f8f9fb',
    'dark':      '#0a0c10',
  };

  const themeBtns = document.querySelectorAll('.theme-btn');

  function setTheme(name, animate) {
    if (!THEME_COLORS[name]) name = 'rose';

    // Гасим ВСЕ transition на один кадр — иначе при смене переменных
    // браузер перерисовывает весь документ и это выглядит как лаг
    html.classList.add('no-transition');

    html.setAttribute('data-theme', name);
    try { localStorage.setItem('theme', name); } catch {}
    themeBtns.forEach(b => b.classList.toggle('active', b.dataset.themeBtn === name));
    if (metaTheme) metaTheme.setAttribute('content', THEME_COLORS[name]);

    // Возвращаем transition через 2 кадра
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        html.classList.remove('no-transition');
      });
    });

    if (animate) {
      const btn = document.querySelector(`.theme-btn[data-theme-btn="${name}"]`);
      if (btn) {
        btn.animate(
          [
            { transform: 'scale(1) rotate(0)' },
            { transform: 'scale(1.35) rotate(20deg)' },
            { transform: 'scale(1) rotate(0)' }
          ],
          { duration: 400, easing: 'cubic-bezier(.22, 1, .36, 1)' }
        );
      }
    }
  }

  // Приоритет: сохранённая → системная → rose
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('theme'); } catch {}
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark' : 'light';
  setTheme(savedTheme || systemTheme, false);

  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', e => {
      let hasSaved = false;
      try { hasSaved = !!localStorage.getItem('theme'); } catch {}
      if (!hasSaved) {
        setTheme(e.matches ? 'dark' : 'light', false);
      }
    });
  } catch {}

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.themeBtn, true));
  });

  /* ─── ШРИФТ ─── */
  const fontBtn = document.getElementById('fontBtn');
  const fontModal = document.getElementById('fontModal');
  const fontOpts = document.querySelectorAll('.font-opt');

  function setFont(name) {
    html.setAttribute('data-font', name);
    try { localStorage.setItem('font', name); } catch {}
    fontOpts.forEach(o => o.classList.toggle('active', o.dataset.fontOpt === name));
  }

  let savedFont = 'modern';
  try { savedFont = localStorage.getItem('font') || 'modern'; } catch {}
  setFont(savedFont);

  if (fontBtn && fontModal && window.GuideModal) {
    fontBtn.addEventListener('click', () => window.GuideModal.open(fontModal));
  }

  fontOpts.forEach(opt => {
    opt.addEventListener('click', () => {
      setFont(opt.dataset.fontOpt);
      if (typeof window.showToast === 'function') {
        window.showToast('🔤 Шрифт: ' + opt.querySelector('.name').textContent);
      }
    });
  });
})();