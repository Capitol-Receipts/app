/* Shared look of the public search pages: styles, header links, footer links and the jump-link row.
Used by the string renderer in server/seo.js and by the React pages in pages/ and components/seo/. */
const CSS = `<style id="sr-css">
.sr{--n:#14274e;--r:#c8323a;--i:#0e1116;--s:#5b6069;--l:#e4e6eb;--b:#f6f7f9;font-family:"Schibsted Grotesk",system-ui,sans-serif;color:var(--i);background:#fff;min-height:100vh}
.sr a{color:var(--n);overflow-wrap:break-word}
.sr-top{background:var(--n);color:#fff}
.sr-top .in{max-width:980px;margin:0 auto;padding:12px 16px;display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center}
.sr-logo{font:800 22px "Barlow Condensed",system-ui,sans-serif;color:#fff!important;text-decoration:none;letter-spacing:-.01em;margin-right:auto}
.sr-logo::before{content:"";display:inline-block;width:1.48em;height:1.4em;margin-right:.36em;vertical-align:-.32em;background:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%2222%2011%20156%20147%22%3E%3Cpath%20d%3D%22M95%2016a5%205%200%201%200%2010%200a5%205%200%201%200-10%200ZM97%2018h6v16h-6ZM88%2034h24v20H88ZM58%20104C58%2072%2078%2050%20100%2050S142%2072%20142%20104ZM50%20104h100v8H50ZM57%20112h6v26h-6ZM67%20112h6v26h-6ZM77%20112h6v26h-6ZM87%20112h6v26h-6ZM97%20112h6v26h-6ZM107%20112h6v26h-6ZM117%20112h6v26h-6ZM127%20112h6v26h-6ZM137%20112h6v26h-6ZM46%20138h108v8H46ZM22%20146h156v12H22Z%22%2F%3E%3C%2Fsvg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%2222%2011%20156%20147%22%3E%3Cpath%20d%3D%22M95%2016a5%205%200%201%200%2010%200a5%205%200%201%200-10%200ZM97%2018h6v16h-6ZM88%2034h24v20H88ZM58%20104C58%2072%2078%2050%20100%2050S142%2072%20142%20104ZM50%20104h100v8H50ZM57%20112h6v26h-6ZM67%20112h6v26h-6ZM77%20112h6v26h-6ZM87%20112h6v26h-6ZM97%20112h6v26h-6ZM107%20112h6v26h-6ZM117%20112h6v26h-6ZM127%20112h6v26h-6ZM137%20112h6v26h-6ZM46%20138h108v8H46ZM22%20146h156v12H22Z%22%2F%3E%3C%2Fsvg%3E") center/contain no-repeat}
.sr-logo span{background:var(--r);padding:1px 7px 2px;border-radius:5px;margin-right:3px}
.sr-top nav a{color:#dfe5f1;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;padding:6px 0}
.sr-top nav a:hover{color:#fff;text-decoration:underline}
.sr-main{max-width:980px;margin:0 auto;padding:16px 16px 48px}
.sr-crumbs{font-size:13px;color:var(--s);margin:0 0 14px;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:4px}
.sr-crumbs li+li:before{content:"›";margin-right:4px;color:#9aa0aa}
.sr-crumbs a{color:var(--s)}
.sr-hero{display:flex;gap:16px;align-items:center;margin-bottom:6px}
.sr-hero img{width:84px;height:84px;border-radius:50%;object-fit:cover;flex:none;background:var(--b)}
.sr h1{font:800 clamp(30px,5vw,44px)/1.04 "Barlow Condensed",system-ui,sans-serif;margin:0 0 6px;letter-spacing:-.01em}
.sr-sub{color:var(--s);font-weight:600;margin:0}
.sr-lead{font-size:18px;line-height:1.5;margin:16px 0 20px;max-width:720px}
.sr-jump{display:flex;flex-wrap:wrap;gap:8px;margin:-6px 0 22px}.sr-jump a{font-size:14px;font-weight:600;text-decoration:none;padding:7px 12px;border-radius:999px;background:var(--b);color:var(--i)}
.sr-more summary{cursor:pointer;font-weight:700;padding:12px 2px;text-decoration:underline;text-underline-offset:3px}.sr-more[open] summary{display:none}
.sr-facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin:0 0 26px;padding:0}
.sr-facts div{background:var(--b);border-radius:12px;padding:12px 14px}
.sr-facts dt{font-size:13px;color:var(--s);font-weight:600}
.sr-facts dd{margin:2px 0 0;font:700 24px "Barlow Condensed",system-ui,sans-serif}
.sr h2{font:700 24px "Barlow Condensed",system-ui,sans-serif;margin:28px 0 8px}
.sr p{line-height:1.55;max-width:760px}
.sr-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--l)}
.sr-list li{padding:9px 2px;border-bottom:1px solid var(--l);display:flex;justify-content:space-between;gap:12px}
.sr-list li span:first-child{min-width:0;overflow-wrap:anywhere}
.sr-list li span:first-child{flex:1 1 auto}
.sr-list li span:last-child{color:var(--s);text-align:right;flex:0 1 auto;max-width:52%;overflow-wrap:normal;word-break:normal}
.sr-list li span.nw{white-space:nowrap;flex:0 0 auto;max-width:none}
.sr-cols{columns:3 220px;column-gap:24px;margin:0;padding:0;list-style:none}
.sr-cols li{break-inside:avoid;padding:3px 0}
.sr-pager{display:flex;flex-wrap:wrap;gap:6px;margin:22px 0}
.sr-pager a,.sr-pager b{padding:6px 11px;border-radius:999px;background:var(--b);text-decoration:none;font-weight:600;font-size:14px}
.sr-pager b{background:var(--n);color:#fff}
.sr-note{font-size:13px;color:var(--s);margin-top:28px}
main.has-cta{padding-bottom:96px}
.sr-cta{position:fixed;right:14px;bottom:14px;z-index:20;background:var(--n);color:#fff!important;text-decoration:none;font-weight:700;padding:9px 14px;border-radius:999px;box-shadow:0 6px 18px rgba(14,17,22,.22);white-space:nowrap;font-size:13px}
.sr-cite{margin-top:28px}.sr-cite summary{cursor:pointer;font-weight:700;padding:8px 0;color:var(--s)}
.sr-cta:hover{background:var(--r)}
.sr-cite p{font-size:14px;color:var(--s);overflow-wrap:anywhere}
.sr-code{background:var(--b);padding:12px;border-radius:10px;font-size:12px;white-space:pre-wrap;word-break:break-all;max-width:760px}
.sr-foot{border-top:1px solid var(--l);margin-top:36px;padding-top:16px;font-size:14px;color:var(--s);display:flex;flex-wrap:wrap;gap:8px 16px}
.sr-foot a{color:var(--s);display:inline-block;padding:4px 0}
@media (prefers-color-scheme:dark){.sr{--i:#e9ecf2;--s:#a3abb9;--l:#2a3140;--b:#171c26;background:#0e1219}.sr a{color:#9db6ff}.sr-crumbs a,.sr-foot a{color:var(--s)}.sr-pager b{background:#2c4c9a}}
</style>`;

const NAV = [['/members', 'Members'], ['/states', 'States'], ['/rankings', 'Rankings'], ['/stocks', 'Stocks'], ['/guides', 'Guides']];
const NAV_ES = [['/es/members', 'Miembros'], ['/es/states', 'Estados'], ['/es/elections', 'Elecciones 2026'], ['/members', 'English']];
const FOOT = [['/members', 'Members of Congress'], ['/past-members', 'Past members'], ['/appointees/all', 'Appointees'], ['/judges', 'Federal judges'], ['/committees', 'Committees'], ['/caucuses', 'Caucuses'], ['/votes', 'Votes'], ['/bills', 'Bills'], ['/pacs', 'PACs'], ['/lobbying', 'Lobbying groups'], ['/lobbying-firms', 'Lobbying firms'], ['/outside-groups', 'Outside spending'], ['/ethics', 'Ethics statements'], ['/companies', 'Companies'], ['/elections', '2026 elections'], ['/states', 'States'], ['/this-week', 'This week in Congress'], ['/rankings', 'Rankings'], ['/stocks', 'Stocks in Congress'], ['/official-trades', 'Officials’ stock trades'], ['/reports', 'Monthly reports'], ['/guides', 'Guides'], ['/es/members', 'En español']];
// long pages get a row of jump links under the intro
function addJump(body, es) {
  const hs = []; let i = 0;
  body = body.replace(/<section><h2>([^<]{2,60})<\/h2>/g, (m, h) => { const id = 's' + (++i); hs.push([id, h]); return `<section id="${id}"><h2>${h}</h2>`; });
  if (hs.length < 4) return body;
  const nav = `<nav class="sr-jump" aria-label="${es ? 'En esta página' : 'On this page'}">${hs.filter(([, h]) => !/^(Related|More|Más|About these numbers|Sobre estas cifras|Common questions|More guides|Other months|Contact|Contacto)$|^(More from|Más de)/.test(h)).slice(0, 7).map(([id, h]) => `<a href="#${id}">${h}</a>`).join('')}</nav>`;
  const at = body.indexOf('</p>', body.indexOf('class="sr-lead"'));
  return at > 0 ? body.slice(0, at + 4) + nav + body.slice(at + 4) : nav + body;
}

const CSS_TEXT = CSS.replace(/^<style id="sr-css">\n/, '').replace(/\n<\/style>$/, '');
module.exports = { CSS, CSS_TEXT, NAV, NAV_ES, FOOT, addJump };
