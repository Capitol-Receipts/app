import type { ReactElement } from 'react';
import AppPage from '../app/AppPage';
import type { AppParts } from '../app/AppPage';
import SeoPage from './SeoPage';
import type { SeoModel, SeoParts } from './SeoPage';

/* A record or directory page: the plain search version, or (on the app's domain with ?app=1) the same record inside
   the app shell. lib/seo-ssp.js decides which and passes `app` when it is the second. */
type Props = { m: SeoModel; parts: SeoParts; app?: { parts: AppParts; route: string; es: boolean } | null };
export default function Entry({ m, parts, app }: Props): ReactElement {
  if (app) return <AppPage kind="record" title={m.title} desc={m.desc} url={m.url} m={m} route={app.route} es={app.es} parts={{ ...app.parts, css: parts.css }} />;
  return <SeoPage m={m} parts={parts} />;
}
