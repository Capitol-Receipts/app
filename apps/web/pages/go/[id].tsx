import type { GetServerSideProps } from 'next';
import AppPage from '../../components/app/AppPage';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { appProps } = require('../../lib/app-parts');

/* App screens with no public page of their own (/go/radar): the app itself, with a title and share preview that name the screen */
export const config = { unstable_runtimeJS: false };
const GO_SCREENS: Record<string, [string, string]> = {
  industries: ['Money by industry', 'Which industries fund each member of Congress, from FEC records.'],
  ind: ['Money by industry', 'How much one industry gives to members of Congress, from FEC records.'],
  radar: ['Conflict radar', 'Stock trades, donors and lobbying that touch the same companies, from public records.'],
  compare: ['Compare members of Congress', 'Put two members of Congress side by side: money, votes, stock trades and lobbying.'],
  mystocks: ['Your stocks in Congress', 'See which members of Congress trade the stocks you own.'],
  perf: ['Stock picks vs the market', 'How each member of Congress’s stock purchases did against the S&P 500.'],
  rank: ['Rankings', 'Members of Congress ranked by stock trades, missed votes, fundraising and more, from public records.'],
  hist: ['Congress history', 'Past members of Congress, past appointees and presidents, from public records.'],
  corrections: ['Corrections', 'Every correction Capitol Receipts has made, and how to report one.'],
  following: ['Following', 'Members of Congress you follow on Capitol Receipts.'],
};
export const getServerSideProps: GetServerSideProps = async ({ res, params }) => {
  const id = String(params?.id || '');
  const k = id.split(':')[0];
  const g = GO_SCREENS[id] || GO_SCREENS[k] || ['Capitol Receipts', 'Who funds Congress, what they trade and how they vote, from public records.'];
  const cc = 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400';
  res.setHeader('Cache-Control', cc); res.setHeader('CDN-Cache-Control', cc); res.setHeader('Vary', 'Accept-Encoding');
  return { props: { id, name: g[0], desc: g[1], parts: JSON.parse(JSON.stringify(appProps())) } };
};
export default function Go({ id, name, desc, parts }: { id: string; name: string; desc: string; parts: Parameters<typeof AppPage>[0]['parts'] }) {
  const title = name === 'Capitol Receipts' ? name : `${name} · Capitol Receipts`;
  return <AppPage kind="go" parts={parts} title={title} desc={desc} url={`https://app.capitolreceipts.com/go/${encodeURIComponent(id)}`} />;
}
