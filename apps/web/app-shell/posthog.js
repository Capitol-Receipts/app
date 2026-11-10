window.__PH={key:"phc_n8UZg3Q74nLoh4pjBwyuPyBnYh5peYuVQbZHn8MsrQF4",app:"capitolreceipts"};
/* Product analytics. Sends page views to the shared PostHog project with a few lines of code instead of
   the full SDK. Off until a key is set. Tags every event with app and platform. Anonymous random id kept
   on this device only; no cookies, no emails, no names. Call window.__track(name, props) for named events. */
(function(){
  var cfg = window.__PH || {};
  if (!cfg.key) return;
  /* Opt-in check, same rule as Google Analytics: visitors in Europe and the UK (by time zone) are counted only after
     they accept on the cookie banner; nobody is counted after saying no or with Global Privacy Control turned on. */
  function allowed(){
    var c = null; try { c = localStorage.getItem("cr_consent"); } catch (e) {}
    if (c === "granted") return true;
    if (c === "denied" || navigator.globalPrivacyControl === true) return false;
    var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    return !/^(Europe\/|Atlantic\/(Reykjavik|Canary|Madeira|Faroe|Azores))/.test(tz);
  }
  window.__phAllowed = allowed;
  if (!allowed()) { window.__track = function(){}; window.__identify = function(){}; window.__trackAuth = function(){}; window.__phStart = start; return; }
  start();
  function start(){
  window.__phStart = null;
  var id; try { id = localStorage.getItem("ph_id"); if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); localStorage.setItem("ph_id", id); } } catch (e) { id = String(Math.random()).slice(2); }
  var platform = (window.Capacitor && Capacitor.getPlatform && Capacitor.getPlatform() !== "web") ? Capacitor.getPlatform() : "web";
  function send(event, props){
    try {
      var p = { token: cfg.key, distinct_id: window.__phUser || id, app: cfg.app, platform: platform,
        $current_url: location.origin + location.pathname, $host: location.host, $pathname: location.pathname,
        $process_person_profile: false };
      for (var k in props) p[k] = props[k];
      fetch("https://us.i.posthog.com/capture/", { method: "POST", keepalive: true, credentials: "omit", mode: "cors",
        headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ api_key: cfg.key, event: event, properties: p, timestamp: new Date().toISOString() }) }).catch(function(){});
    } catch (e) {}
  }
  window.__track = function(n, p){ send(n, p || {}); };
  window.__identify = function(uid){ window.__phUser = cfg.app + ":" + uid; };
  window.__trackAuth = function(client){
    try {
      client.auth.onAuthStateChange(function(ev, s){
        if (ev !== "SIGNED_IN" || !s || !s.user) return;
        var k = "ph_in_" + s.user.id;
        try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch (e) {}
        window.__identify(s.user.id);
        var m = (s.user.app_metadata && s.user.app_metadata.provider) || "email";
        if (Date.now() - new Date(s.user.created_at).getTime() < 120000) window.__track("signed_up", { method: m });
        window.__track("signed_in", { method: m });
      });
    } catch (e) {}
  };
  send("$pageview", {});
  }
})();
