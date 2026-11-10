import Head from 'next/head';
import type { ReactElement } from 'react';
import { FONT_SWAP, SeoFrame, seoMetaTags } from '../seo/SeoPage';
import type { SeoModel } from '../seo/SeoPage';

/* The app's own page: the shell every app screen runs inside. The screens themselves are the scripts in
   public/app/js, which fill #app once main.js has started. Three kinds of address use it:
   - home: the app's front door (the boot message and the links to the public lists)
   - go: an app screen with no public page (/go/radar), with a title and share preview that name the screen
   - record: a record page opened inside the app (?app=1): the readable record sits in #app until the app replaces it */
export type AppParts = { sentry: string; posthog: string; errors: string; prefetch: string; gtag: string; main: string; sw: string; consent: string; gaSrc: string; bootCss: string; ld: string; ver: string; css?: string };
export type AppProps = {
  kind: 'home' | 'go' | 'record';
  title: string; desc: string; url: string; ogTitle?: string; ogDesc?: string; image?: string;
  m?: SeoModel; route?: string | null; es?: boolean;
  parts: AppParts;
};

const js = (code: string) => ({ __html: code });
const HOME_TITLE = 'Capitol Receipts: Who Funds Congress, Their Stock Trades & Votes';
const SHARE = 'https://www.capitolreceipts.com/img/share.png?v=20261015';

export default function AppPage({ kind, title, desc, url, ogTitle, ogDesc, image, m, route, es, parts }: AppProps): ReactElement {
  const css = (f: string) => '/app/css/' + f + '.css?v=' + parts.ver;
  const routeJs = kind === 'record' && route
    ? `window.__ROUTE=${JSON.stringify(route)};window.__HOLD=true;${es ? "try{localStorage.setItem('pt_lang',JSON.stringify('es'))}catch(e){}" : ''}`
    : '';
  return (
    <>
      <Head>
        <script key="s1" dangerouslySetInnerHTML={js(parts.sentry)} />
        <script key="s2" dangerouslySetInnerHTML={js(parts.posthog)} />
        <script key="s3" dangerouslySetInnerHTML={js(parts.errors)} />
        <script key="s4" dangerouslySetInnerHTML={js(parts.prefetch)} />
        <script key="ga" async src={parts.gaSrc} />
        <script key="s5" dangerouslySetInnerHTML={js(parts.gtag)} />
        <meta key="viewport" name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{title}</title>
        <meta name="description" content={desc} />
        {kind === 'record' && m && seoMetaTags(m)}
        {kind !== 'record' && <link key="canon" rel="canonical" href={url} />}
        {kind === 'home' && <meta key="robots" name="robots" content="noindex,follow" />}
        {kind === 'go' && <meta key="robots" name="robots" content="noindex" />}
        {kind !== 'record' && <meta key="og-site" property="og:site_name" content="Capitol Receipts" />}
        {kind !== 'record' && <meta key="og-type" property="og:type" content="website" />}
        {kind !== 'record' && <meta key="og-title" property="og:title" content={ogTitle || title} />}
        {kind !== 'record' && <meta key="og-desc" property="og:description" content={ogDesc || desc} />}
        {kind !== 'record' && <meta key="og-url" property="og:url" content={url} />}
        {kind !== 'record' && <meta key="og-img" property="og:image" content={image || SHARE} />}
        {kind !== 'record' && <meta key="tw-card" name="twitter:card" content="summary_large_image" />}
        {kind !== 'record' && <meta key="tw-img" name="twitter:image" content={image || SHARE} />}
        <link rel="icon" href="https://www.capitolreceipts.com/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="https://www.capitolreceipts.com/apple-touch-icon.png" />
        {kind !== 'record' && <script key="ld" type="application/ld+json" dangerouslySetInnerHTML={js(parts.ld)} />}
        <meta name="theme-color" content="#14274e" />
        <link rel="preconnect" href="https://hxgckcriehvrolwnabpd.supabase.co" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Schibsted+Grotesk:wght@500;600;700;800&display=swap" media="print" />
        <script key="fs1" dangerouslySetInnerHTML={js(FONT_SWAP)} />
        <link rel="stylesheet" href={css('style')} />
        <link rel="stylesheet" href={css('friendly')} />
        <link rel="stylesheet" href={css('desktop')} />
        <link rel="stylesheet" href={css('hdr')} media="print" />
        <script key="fs2" dangerouslySetInnerHTML={js(FONT_SWAP)} />
        <style key="boot" dangerouslySetInnerHTML={js(parts.bootCss)} />
        {kind === 'record' && <style id="sr-css" dangerouslySetInnerHTML={js(parts.css || '')} />}
      </Head>
      <div id="app">
        {kind === 'record' && m ? <SeoFrame m={m} /> : (
          <div className="boot"><div>
            <b><span>Capitol</span>Receipts</b>
            <p id="bootmsg">Loading the latest records…</p>
            <p style={{ fontSize: '13px', marginTop: '18px' }}><a href="/members">Members</a> · <a href="/bills">Bills</a> · <a href="/pacs">PACs</a> · <a href="/lobbying">Lobbying</a> · <a href="/elections">2026 races</a> · <a href="/states">States</a></p>
          </div></div>
        )}
      </div>
      <nav className="tabbar" aria-label="Main"><div className="in" id="tabbar"></div></nav>
      <div id="sheet" className="sheet" hidden><div className="panel" id="panel" role="dialog" aria-modal="true"></div></div>
      {routeJs && <script dangerouslySetInnerHTML={js(routeJs)} />}
      <script dangerouslySetInnerHTML={js(parts.main)} />
      <script dangerouslySetInnerHTML={js(parts.sw)} />
      <script data-consent="" dangerouslySetInnerHTML={js(parts.consent)} />
    </>
  );
}
