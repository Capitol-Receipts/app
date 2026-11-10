
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500,
    region: ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'] });
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  try { if (localStorage.getItem('cr_consent') === 'granted') gtag('consent', 'update', { analytics_storage: 'granted' }); } catch (e) {}
  gtag('js', new Date());

  gtag('config', 'G-2PVF462YXR', { allow_google_signals: false, allow_ad_personalization_signals: false, linker: { domains: ['capitolreceipts.com', 'www.capitolreceipts.com', 'app.capitolreceipts.com'] } });
  /* event helpers: track(name, params); gaIds() gives the visitor's GA ids so Stripe purchases can be credited to the right visit */
  window.track = function (n, p) { try { gtag('event', n, p || {}); } catch (e) {} };
  window.gaIds = function () {
    var get = function (k) { return new Promise(function (ok) { var done = false; try { gtag('get', 'G-2PVF462YXR', k, function (v) { done = true; ok(v || ''); }); } catch (e) {} setTimeout(function () { if (!done) ok(''); }, 800); }); };
    return Promise.all([get('client_id'), get('session_id')]).then(function (r) { return { cid: String(r[0] || ''), sid: String(r[1] || '') }; });
  };
  window.addEventListener('click', function (e) {
    try {
      var el = e.target.closest && e.target.closest('[data-follow],[data-share],[data-lang],[data-try],[data-ptype],[data-rank]');
      if (!el) return;
      var d = el.dataset;
      if (d.follow) track(typeof S !== 'undefined' && S.following && S.following.has(d.follow) ? 'unfollow' : 'follow', { item_id: d.follow });
      else if ('share' in d) track('share', { content_type: 'page', item_id: location.pathname });
      else if (d.lang) track('change_language', { language: d.lang });
      else if (d.try) track('search', { search_term: d.try, source: 'suggestion' });
      else if (d.ptype) track('filter_pacs', { type: d.ptype });
      else if (d.rank) track('view_ranking', { ranking: d.rank });
    } catch (err) {}
  }, true);
