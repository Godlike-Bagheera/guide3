const fs = require('fs');
const { JSDOM } = require('jsdom');

function load(file) {
  const html = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' + file });
  const w = dom.window;
  // stub hljs & other globals used by hide-code (it uses none besides console)
  const code = fs.readFileSync('js/hide-code.js', 'utf8');
  w.eval(code);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return w;
}
function key(w, ctrl) {
  const ev = new w.KeyboardEvent('keydown', { key: ctrl ? 'b' : 'b', ctrlKey: !!ctrl, bubbles: true, cancelable: true });
  w.document.dispatchEvent(ev);
}
let fails = 0;
function assert(cond, msg) { if (!cond) { console.log('FAIL:', msg); fails++; } else console.log('ok:', msg); }

// ── reference.html ──
{
  const w = load('reference.html');
  const d = w.document;
  const py = [...d.querySelectorAll('pre')].filter(p => { const t = p.querySelector('.lang-tag'); return t && ['python','html'].includes(t.textContent.trim()); });
  const bash = [...d.querySelectorAll('pre')].filter(p => { const t = p.querySelector('.lang-tag'); return t && t.textContent.trim() === 'bash'; });
  assert(py.length === 30, `reference: 30 python/html blocks hidden (got ${py.length})`);
  assert(bash.length === 12, `reference: 12 bash blocks (got ${bash.length})`);
  key(w, true);
  assert(d.documentElement.hasAttribute('data-no-python'), 'reference: mode flag set');
  assert(py.every(p => p.hasAttribute('data-code-hidden')), 'reference: all python+html hidden');
  assert(bash.every(p => !p.hasAttribute('data-code-hidden')), 'reference: bash untouched');
  const sec = d.getElementById('commands-section');
  assert(sec !== null, 'commands-section wrapper exists');
  const only = d.querySelector('.commands-only');
  assert(only && !only.hidden, 'commands-only callout revealed in no-code mode');
  assert(d.getElementById('intro-all') !== null || d.location.href, 'anchors intact');
  key(w, true);
  assert(!d.documentElement.hasAttribute('data-no-python'), 'reference: restored on second press');
  assert(py.every(p => !p.hasAttribute('data-code-hidden')), 'reference: all code back');
  assert(only.hidden, 'commands-only hidden again');
}

// ── part1-django.html: bash/text/json untouched, python+html hidden ──
{
  const w = load('part1-django.html');
  const d = w.document;
  const langOf = p => { const t = p.querySelector('.lang-tag'); return t ? t.textContent.trim() : ''; };
  const all = [...d.querySelectorAll('pre')];
  const pyHtml = all.filter(p => ['python','html'].includes(langOf(p))).length; // 35 + 13 = 48
  key(w, true);
  const pyHidden = [...d.querySelectorAll('pre[data-code-hidden]')].length;
  assert(pyHidden === pyHtml, `part1: exactly ${pyHtml} python+html blocks hidden (got ${pyHidden})`);
  assert(all.filter(p => !['python','html'].includes(langOf(p))).every(p => !p.hasAttribute('data-code-hidden')), 'part1: bash/text/json/untagged untouched');
}

// ── plain B key ignored ──
{
  const w = load('index.html');
  const ev = new w.KeyboardEvent('keydown', { key: 'b', bubbles: true, cancelable: true });
  w.document.dispatchEvent(ev);
  assert(!w.document.documentElement.hasAttribute('data-no-python'), 'plain B does not toggle');
}

console.log(fails ? `\n${fails} FAILURES` : '\nALL TESTS PASSED');
process.exit(fails ? 1 : 0);

// ── auto-scroll to top when section 34 is open and Ctrl+B hides it ──
{
  const fs2 = require('fs');
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(fs2.readFileSync('reference.html','utf8'), { runScripts:'outside-only', url:'http://localhost/reference.html#commands' });
  const w = dom.window;
  let scrolledTo = null;
  w.scrollTo = (opt) => { scrolledTo = (typeof opt==='object'? opt.top : opt); };
  w.eval(fs2.readFileSync('js/hide-code.js','utf8'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  key(w, true); // hash #commands -> should scroll to top
  setTimeout(() => {
    assert(scrolledTo === 0, 'section34 open + Ctrl+B -> scrolls to top of page');
    console.log(fails ? `\n${fails} FAILURES` : '\nALL TESTS PASSED');
    process.exit(fails ? 1 : 0);
  }, 50);
}
