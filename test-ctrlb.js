/* Тесты режима «без кода» (Ctrl+B / кнопка </> в шапке). Запуск: node test-ctrlb.js */
const fs = require('fs');
const { JSDOM } = require('jsdom');

let failures = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' — ' + name);
  if (!cond) failures++;
}

function loadPage(file) {
  const html = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' + file, runScripts: 'dangerously', pretendToBeVisual: true });
  // localStorage stub
  const store = {};
  Object.defineProperty(dom.window, 'localStorage', { value: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  }});
  // hide-code.js written inline to control execution order
  const src = fs.readFileSync('js/hide-code.js', 'utf8');
  const script = dom.window.document.createElement('script');
  script.textContent = src;
  dom.window.document.body.appendChild(script);
  return { dom, store };
}

function langOf(pre) {
  const t = pre.querySelector('.lang-tag');
  return t ? t.textContent.trim().toLowerCase() : '';
}

// ─── part1-django.html: скрываются python+html, bash не трогается ───
{
  const { dom, store } = loadPage('part1-django.html');
  const w = dom.window, d = w.document;
  d.dispatchEvent(new w.Event('DOMContentLoaded'));
  const pres = [...d.querySelectorAll('pre')];
  const py = pres.filter(p => ['python','py'].includes(langOf(p)));
  const bash = pres.filter(p => langOf(p) === 'bash');
  const htmlB = pres.filter(p => langOf(p) === 'html');
  check('part1: найдены python-блоки', py.length === 35);
  check('part1: найдены bash-блоки', bash.length === 38);
  check('part1: найдены html-блоки', htmlB.length === 13);

  // Ctrl+B
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));
  check('part1: все python скрыты', py.every(p => p.hasAttribute('data-code-hidden')));
  check('part1: все html скрыты', htmlB.every(p => p.hasAttribute('data-code-hidden')));
  check('part1: bash НЕ скрыты', bash.every(p => !p.hasAttribute('data-code-hidden')));
  check('part1: описания показаны', [...d.querySelectorAll('.code-desc')].some(e => !e.hidden));
  check('part1: режим сохранён в localStorage', store['guide-no-code'] === '1');
  check('part1: кнопка активна', d.getElementById('codeToggleBtn').classList.contains('active'));
  check('part1: bash-блоки помечены бейджем', bash.every(p => p.getAttribute('data-lang-badge') === 'bash'));

  // повторное Ctrl+B возвращает код
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));
  check('part1: код вернулся', py.every(p => !p.hasAttribute('data-code-hidden')) && htmlB.every(p => !p.hasAttribute('data-code-hidden')));
  check('part1: localStorage сброшен', store['guide-no-code'] === '0');

  // клик по кнопке тоже переключает
  d.getElementById('codeToggleBtn').click();
  check('part1: кнопка переключает режим', py.every(p => p.hasAttribute('data-code-hidden')));
  d.getElementById('codeToggleBtn').click();

  // простая клавиша B не трогает режим
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'b', bubbles: true }));
  check('part1: B без Ctrl игнорируется', py.every(p => !p.hasAttribute('data-code-hidden')));
}

// ─── reference.html: раздел 34 скрывается целиком, автопрокрутка ───
{
  const { dom, store } = loadPage('reference.html');
  const w = dom.window, d = w.document;
  w.location.hash = '#commands';
  let scrolled = false;
  w.scrollTo = () => { scrolled = true; };
  d.dispatchEvent(new w.Event('DOMContentLoaded'));
  const pres = [...d.querySelectorAll('pre')];
  const sec = d.getElementById('commands-section');
  const pyIn34 = [...sec.querySelectorAll('pre')].filter(p => ['python','html'].includes(langOf(p)));
  const bashIn34 = [...sec.querySelectorAll('pre')].filter(p => langOf(p) === 'bash');
  check('ref34: python/html блоков в разделе 34 = 30', pyIn34.length === 30);
  check('ref34: bash блоков в разделе 34 = 12', bashIn34.length === 12);
  check('ref34: навигация по вариантам есть', !!d.querySelector('.variant-nav') && d.querySelectorAll('.variant-chip').length === 3);
  check('ref34: три блока вариантов', d.querySelectorAll('.commands-variant-block').length === 3);

  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));
  check('ref34: атрибут data-no-python на html', d.documentElement.hasAttribute('data-no-python'));
  check('ref34: подсказка commands-only показана', [...d.querySelectorAll('.commands-only')].every(e => !e.hidden));
  check('ref34: прокрутка в начало вызвана', scrolled);

  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));
  check('ref34: режим выключен', !d.documentElement.hasAttribute('data-no-python'));
}

// ─── восстановление сохранённого режима при загрузке ───
{
  const { dom } = loadPage('intro.html');
  const w = dom.window, d = w.document;
  // предварительно ставим сохранённый режим
  w.localStorage.setItem('guide-no-code', '1');
  d.dispatchEvent(new w.Event('DOMContentLoaded'));
  check('intro: сохранённый режим «без кода» восстановлен', d.documentElement.hasAttribute('data-no-python'));
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL TESTS PASSED');
process.exit(failures ? 1 : 0);
