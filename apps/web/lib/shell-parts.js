/* The analytics, error-report, cookie-choice and offline scripts that every page carries, read from app-shell/*.js
so there is one copy. The React search pages (components/seo) print the same scripts the app's own page prints. */
const { appParts } = require('./app-parts');

let CACHE = null;
function shellParts() {
  if (CACHE) return CACHE;
  const p = appParts();
  CACHE = {
    before: [p['sentry-config'], p.posthog, p.errors],
    gaSrc: p.gaSrc,
    after: [p.gtag],
    bootCss: p.bootCss,
    sw: p['sw-register'],
    consent: p.consent,
  };
  return CACHE;
}
module.exports = { shellParts };
