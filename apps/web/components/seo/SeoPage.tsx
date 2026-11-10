import Head from 'next/head';
import type { ReactElement } from 'react';

/* A public search page: the plain, fast version of a record or hub page (no app download, nothing that moves after it
   loads). Prints the same head tags, header, body and footer as server/seo.js. `m` comes from lib/seo-model.js. */
type Crumb = [string, string | null];
export type SeoModel = {
  lang: 'en' | 'es'; title: string; desc: string; url: string; noindex: boolean;
  alt: { en: string; es: string } | null; ogType: string; ogLocale: string; image: string;
  ld: unknown[]; body: string; logoHref: string; navLabel: string; nav: [string, string][]; crumbs: Crumb[];
  cta: { href: string; text: string } | null;
  cite: { summary: string; text: string; embedHelp: string | null; embed: string | null } | null;
  foot: [string, string][]; footHow: string; footAbout: string; site: string;
};
export type SeoParts = { before: string[]; gaSrc: string; after: string[]; bootCss: string; sw: string; consent: string; css: string };

// the font file loads without holding up the page, then applies (a plain onload attribute needs the client runtime these pages leave out)
const FONT_SWAP = "(function(){var l=document.currentScript.previousElementSibling;if(!l)return;var a=function(){l.media='all'};if(l.sheet)a();else l.addEventListener('load',a)})()";

export default function SeoPage({ m, parts }: { m: SeoModel; parts: SeoParts }): ReactElement {
  const js = (code: string) => ({ __html: code });
  return (
    <>
      <Head>
        {parts.before.map((c, i) => <script key={'b' + i} dangerouslySetInnerHTML={js(c)} />)}
        <script key="ga" async src={parts.gaSrc} />
        {parts.after.map((c, i) => <script key={'a' + i} dangerouslySetInnerHTML={js(c)} />)}
        <meta key="viewport" name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{m.title}</title>
        <meta name="description" content={m.desc} />
        <link rel="icon" href="https://www.capitolreceipts.com/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="https://www.capitolreceipts.com/apple-touch-icon.png" />
        <meta name="theme-color" content="#14274e" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Schibsted+Grotesk:wght@500;600;700;800&display=swap" media="print" />
        <script key="fontswap" dangerouslySetInnerHTML={js(FONT_SWAP)} />
        <style dangerouslySetInnerHTML={js(parts.bootCss)} />
        {!m.noindex && <link rel="canonical" href={m.url} />}
        {!m.noindex && m.alt && <link rel="alternate" hrefLang="en" href={m.alt.en} />}
        {!m.noindex && m.alt && <link rel="alternate" hrefLang="es" href={m.alt.es} />}
        {!m.noindex && m.alt && <link rel="alternate" hrefLang="x-default" href={m.alt.en} />}
        <meta name="robots" content={m.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'} />
        <meta property="og:site_name" content="Capitol Receipts" />
        <meta property="og:locale" content={m.ogLocale} />
        <meta property="og:type" content={m.ogType} />
        <meta property="og:title" content={m.title} />
        <meta property="og:description" content={m.desc} />
        <meta property="og:url" content={m.url} />
        <meta property="og:image" content={m.image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={m.title} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={m.title} />
        <meta name="twitter:description" content={m.desc} />
        <meta name="twitter:image" content={m.image} />
        {m.ld.map((x, i) => <script key={'ld' + i} type="application/ld+json" dangerouslySetInnerHTML={js(JSON.stringify(x).replace(/</g, '\\u003c'))} />)}
        <style id="sr-css" dangerouslySetInnerHTML={js(parts.css)} />
      </Head>
      <div id="app">
        <div className="sr" lang={m.lang}>
          <header className="sr-top"><div className="in">
            <a className="sr-logo" href={m.logoHref}><span>Capitol</span>Receipts</a>
            <nav aria-label={m.navLabel}>{m.nav.map(([h, l], i) => <span key={h}>{i > 0 && ' '}<a href={h}>{l}</a></span>)}</nav>
          </div></header>
          <main className={'sr-main' + (m.cta ? ' has-cta' : '')}>
            <ol className="sr-crumbs">{m.crumbs.map(([t, h], i) => <li key={i}>{h ? <a href={h}>{t}</a> : t}</li>)}</ol>
            <div style={{ display: 'contents' }} dangerouslySetInnerHTML={js(m.body)} />
            {m.cite && (
              <details className="sr-cite"><summary>{m.cite.summary}</summary><p>{m.cite.text}</p>
                {m.cite.embed && <><p>{m.cite.embedHelp}</p><pre className="sr-code">{m.cite.embed}</pre></>}
              </details>
            )}
            <footer className="sr-foot">
              {m.foot.map(([h, l]) => <a key={h} href={h}>{l}</a>)}
              <a href={m.site + '/how-it-works'}>{m.footHow}</a><a href={m.site + '/'}>{m.footAbout}</a>
            </footer>
          </main>
          {m.cta && <a className="sr-cta" href={m.cta.href} rel="nofollow">{m.cta.text} ›</a>}
        </div>
      </div>
      <script dangerouslySetInnerHTML={js(parts.sw)} />
      <script data-consent="" dangerouslySetInnerHTML={js(parts.consent)} />
    </>
  );
}
