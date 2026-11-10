/* The analytics, error-report, cookie-choice and offline scripts that every page carries, read from public/index.html
so there is one copy. The React search pages (components/seo) print the same scripts the app's own page prints. */
const fs = require('fs');
const here = require('../server/_here');

let CACHE = null;
function shellParts() {
  if (CACHE) return CACHE;
  const h = fs.readFileSync(here('public', 'index.html'), 'utf8');
  const head = h.slice(0, h.indexOf('<meta name="viewport"'));
  const inline = [...head.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((js) => !js.startsWith('/* boot-prefetch'));
  const ga = head.match(/<script async src="([^"]+)"><\/script>/);
  const gaAt = head.indexOf('<!-- Google tag');
  const before = inline.filter((js) => head.indexOf(js) < gaAt), after = inline.filter((js) => head.indexOf(js) >= gaAt);
  const boot = h.match(/<style>\n(\s*\.boot\{[\s\S]*?)<\/style>/);
  const sw = h.match(/<script>(\/\* offline support \*\/[\s\S]*?)<\/script>/);
  const consent = h.match(/<script data-consent>([\s\S]*?)<\/script>/);
  if (!ga || !before.length || !after.length || !boot || !sw || !consent) throw new Error('index.html no longer has the shared scripts in the expected places');
  CACHE = { before, gaSrc: ga[1], after, bootCss: boot[1], sw: sw[1], consent: consent[1] };
  return CACHE;
}
module.exports = { shellParts };
