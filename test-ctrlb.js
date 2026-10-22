/* Тесты режима «без кода» (переключается по Ctrl+B). Запуск: node test-ctrlb.js */
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
  check('part1: bash-блоки помечены бейджем', bash.every(p => p.getAttribute('data-lang-badge') === 'bash'));

  // повторное Ctrl+B возвращает код
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));
  check('part1: код вернулся', py.every(p => !p.hasAttribute('data-code-hidden')) && htmlB.every(p => !p.hasAttribute('data-code-hidden')));
  check('part1: localStorage сброшен', store['guide-no-code'] === '0');

  // простая клавиша B не трогает режим
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'b', bubbles: true }));
  check('part1: B без Ctrl игнорируется', py.every(p => !p.hasAttribute('data-code-hidden')));
}

// ─── reference.html: раздел 34 — скрываются только файлы, bash виден ───
{
  const { dom, store } = loadPage('reference.html');
  const w = dom.window, d = w.document;
  w.location.hash = '#commands';
  let scrolled = false;
  w.scrollTo = () => { scrolled = true; };
  d.dispatchEvent(new w.Event('DOMContentLoaded'));
  const sec = d.getElementById('commands-section');
  /* в jsdom нет layout: все элементы имеют нулевой rect, поэтому имитируем,
     что раздел 34 находится в области видимости экрана */
  sec.getBoundingClientRect = () => ({ top: 100, bottom: 500, left: 0, right: 0 });
  const pyIn34 = [...sec.querySelectorAll('pre')].filter(p => ['python','html'].includes(langOf(p)));
  const bashIn34 = [...sec.querySelectorAll('pre')].filter(p => langOf(p) === 'bash');
  check('ref34: python/html блоков в разделе 34 = 36', pyIn34.length === 36);
  check('ref34: bash блоков в разделе 34 = 17', bashIn34.length === 17);
  check('ref34: навигация по вариантам есть', !!d.querySelector('.variant-nav') && d.querySelectorAll('.variant-chip').length === 5);
  check('ref34: пять блоков вариантов (A, B, C, D, Оффлайн)', d.querySelectorAll('.commands-variant-block').length === 5);
  check('ref34: вариант D «своя тема» присутствует', !!d.getElementById('cmd-own'));

  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));
  check('ref34: атрибут data-no-python на html', d.documentElement.hasAttribute('data-no-python'));
  check('ref34: РАЗДЕЛ 34 ПОЛНОСТЬЮ СКРЫТ (sec.hidden)', sec.hidden === true);
  check('ref34: пункт навигации «34...» скрыт в левой панели reference',
    [...d.querySelectorAll('a[href="#commands"]')].every(a => { const li = a.closest('li'); return li && li.hidden; }));
  check('ref34: все python/html-файлы раздела 34 скрыты', pyIn34.every(p => p.hasAttribute('data-code-hidden')));
  check('ref34: автопрокрутка вверх вызвана (раздел был открыт)', scrolled);

  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));
  check('ref34: режим выключен', !d.documentElement.hasAttribute('data-no-python'));
  check('ref34: раздел 34 вернулся на экран', sec.hidden === false);
  check('ref34: пункт навигации «34...» снова виден',
    [...d.querySelectorAll('a[href="#commands"]')].every(a => { const li = a.closest('li'); return li && !li.hidden; }));
  check('ref34: код вернулся', pyIn34.every(p => !p.hasAttribute('data-code-hidden')));
}

// ─── левая панель на ДРУГИХ страницах: пункт 34 тоже скрывается ───
{
  const { dom } = loadPage('part1-django.html');
  const w = dom.window, d = w.document;
  d.dispatchEvent(new w.Event('DOMContentLoaded'));
  const navLinks = [...d.querySelectorAll('a[href="reference.html#commands"]')];
  check('part1: пункт навигации на раздел 34 найден', navLinks.length === 1);
  check('part1: в режиме «с кодом» пункты 34 видны', navLinks.every(a => { const li = a.closest('li'); return li && !li.hidden; }));
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));
  check('part1: Ctrl+B скрывает пункт 34 из левой панели', navLinks.every(a => { const li = a.closest('li'); return li && li.hidden; }));
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));
  check('part1: повторный Ctrl+B возвращает пункт 34', navLinks.every(a => { const li = a.closest('li'); return li && !li.hidden; }));
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
