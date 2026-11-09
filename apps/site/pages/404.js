// Serves the existing static 404 page (public/404.html) with a real 404 status.
import fs from 'node:fs';
import path from 'node:path';
import Head from 'next/head';

export async function getStaticProps() {
  const html = fs.readFileSync(path.join(process.cwd(), 'public', '404.html'), 'utf8');
  const head = (html.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [, ''])[1];
  const body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || [, html])[1];
  const title = (head.match(/<title>([\s\S]*?)<\/title>/i) || [, 'Page not found'])[1];
  const links = [...head.matchAll(/<link[^>]+>/gi)].map((m) => m[0]);
  return { props: { title, links, body } };
}

export default function NotFound({ title, links, body }) {
  return (<>
    <Head><title>{title}</title><meta name="robots" content="noindex" />
      {links.map((l, i) => <link key={i} {...Object.fromEntries([...l.matchAll(/(\w[\w-]*)="([^"]*)"/g)].map((m) => [m[1] === 'crossorigin' ? 'crossOrigin' : m[1], m[2]]))} />)}
    </Head>
    <div dangerouslySetInnerHTML={{ __html: body }} />
  </>);
}
