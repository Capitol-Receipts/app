/* The app page's scripts, read from app-shell/*.js (each file is one inline script, exactly as it runs in the browser).
APP_VER comes from the main script: bump it with scripts/bump_version.sh, which also changes the style sheet links. */
const fs = require('fs');
const here = require('../server/_here');

const FILES = ['sentry-config', 'posthog', 'errors', 'prefetch', 'gtag', 'main', 'sw-register', 'consent'];
let CACHE = null;
function appParts() {
  if (CACHE) return CACHE;
  const p = {};
  for (const f of FILES) p[f] = fs.readFileSync(here('app-shell', f + '.js'), 'utf8');
  const v = /const APP_VER='([^']*)'/.exec(p.main);
  if (!v) throw new Error('app-shell/main.js has no APP_VER');
  p.ver = v[1];
  p.gaSrc = 'https://www.googletagmanager.com/gtag/js?id=G-2PVF462YXR';
  p.bootCss = fs.readFileSync(here('app-shell', 'boot.css'), 'utf8');
  p.ld = fs.readFileSync(here('app-shell', 'ld.json'), 'utf8').trim();
  CACHE = p;
  return p;
}
module.exports = { appParts };

// what the app page component prints: the scripts, the style sheet version and the boot styles
function appProps() {
  const p = appParts();
  return { sentry: p['sentry-config'], posthog: p.posthog, errors: p.errors, prefetch: p.prefetch, gtag: p.gtag, main: p.main, sw: p['sw-register'], consent: p.consent, gaSrc: p.gaSrc, bootCss: p.bootCss, ld: p.ld, ver: p.ver };
}
module.exports.appProps = appProps;
