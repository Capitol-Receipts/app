/* Error reporting. Sends uncaught errors to Sentry with a few lines of code instead of the 30 kB SDK.
   Off until a DSN is set in the config. Sends the message, a stack and the page path only: no cookies,
   no user ids, no query strings. At most 5 reports per page load, each message once. */
(function(){
  var cfg = window.__CR || {};
  var m = /^https:\/\/([^@]+)@([^/]+)\/(\d+)$/.exec(cfg.sentryDsn || "");
  if (!m) return;
  var url = "https://" + m[2] + "/api/" + m[3] + "/envelope/?sentry_key=" + m[1] + "&sentry_version=7";
  var sent = 0, seen = {};
  function hex(n){ var a = new Uint8Array(n/2); (window.crypto||{}).getRandomValues && crypto.getRandomValues(a); var s = ""; for (var i=0;i<a.length;i++) s += ("0"+a[i].toString(16)).slice(-2); return s; }
  function send(type, value, stack){
    try {
      var msg = String(value || type).slice(0, 500), key = type + msg;
      if (seen[key] || sent >= 5) return;
      seen[key] = 1; sent++;
      var id = hex(32);
      var ev = { event_id: id, timestamp: Date.now()/1000, platform: "javascript", level: "error",
        environment: location.hostname, release: cfg.release || undefined,
        exception: { values: [{ type: type, value: msg }] },
        request: { url: location.origin + location.pathname },
        extra: { stack: String(stack || "").slice(0, 4000) } };
      var body = JSON.stringify({ event_id: id, sent_at: new Date().toISOString() }) + "\n" +
        JSON.stringify({ type: "event" }) + "\n" + JSON.stringify(ev);
      fetch(url, { method: "POST", body: body, keepalive: true, mode: "cors", credentials: "omit",
        headers: { "Content-Type": "text/plain;charset=UTF-8" } }).catch(function(){});
    } catch (e) {}
  }
  window.addEventListener("error", function(e){
    if (!e || (!e.error && !e.message)) return;
    send((e.error && e.error.name) || "Error", (e.error && e.error.message) || e.message, e.error && e.error.stack);
  });
  window.addEventListener("unhandledrejection", function(e){
    var r = e && e.reason;
    send((r && r.name) || "UnhandledRejection", (r && r.message) || r, r && r.stack);
  });
})();
