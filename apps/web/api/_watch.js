// Sends errors thrown inside an API function to Sentry. Does nothing until SENTRY_DSN is set.
// Wrap a handler: module.exports = watch(handler).
const Sentry = require("@sentry/node");

let started = false;
function start() {
  if (started) return;
  started = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

const watch = (handler) => async (req, res) => {
  start();
  try {
    return await handler(req, res);
  } catch (err) {
    if (process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setTag("route", req && req.url ? String(req.url).split("?")[0] : "unknown");
        scope.setTag("method", req && req.method);
        Sentry.captureException(err);
      });
      await Sentry.flush(2000).catch(() => {});
    } else {
      console.error("watch (not reporting):", err);
    }
    if (res && !res.headersSent) res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = { watch };
