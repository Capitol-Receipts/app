import type { GetServerSideProps } from 'next';
import SeoPage from '../../components/seo/SeoPage';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { respond } = require('../../lib/seo-ssp');

/* A shared quiz score: its own preview card, then on to the quiz. www/quiz/score/<n> reaches this page through a rewrite. */
export const config = { unstable_runtimeJS: false };
export const getServerSideProps: GetServerSideProps = async ({ res, params }) => {
  const n = Math.max(0, Math.min(9, parseInt(String(params?.n || '0'), 10) || 0));
  const out = respond(res, {
    title: `I got ${n} of 9 on the Congress quiz | Capitol Receipts`,
    desc: 'Nine questions about stock trades, campaign money and votes in Congress, each answered from public records. How many can you get?',
    path: `/quiz/score/${n}`, noindex: true, route: null, image: `https://app.capitolreceipts.com/og/quiz/${n}.png`,
    body: `<h1>I got ${n} of 9 on the Congress quiz</h1><p class="sr-lead">Nine questions about stock trades, campaign money and votes, each answered from public records.</p><p><a href="/quiz">Take the quiz</a></p><script>location.replace('/quiz?from=score')</script>`,
  }, {});
  const cc = 'public, max-age=600, s-maxage=604800, stale-while-revalidate=2592000';
  res.setHeader('Cache-Control', cc); res.setHeader('CDN-Cache-Control', cc);
  return out;
};
export default SeoPage;
