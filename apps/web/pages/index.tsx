import type { GetServerSideProps } from 'next';
import AppPage from '../components/app/AppPage';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { appProps } = require('../lib/app-parts');

/* The app's front door (app.capitolreceipts.com). It is not a search page: the public home page is on www. */
export const config = { unstable_runtimeJS: false };
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const cc = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';
  res.setHeader('Cache-Control', cc); res.setHeader('CDN-Cache-Control', cc); res.setHeader('Vary', 'Accept-Encoding');
  return { props: { parts: JSON.parse(JSON.stringify(appProps())) } };
};
export default function Home({ parts }: { parts: Parameters<typeof AppPage>[0]['parts'] }) {
  return (
    <AppPage kind="home" parts={parts} url="https://app.capitolreceipts.com/"
      title="Capitol Receipts: Who Funds Congress, Their Stock Trades & Votes"
      desc="Look up any member of Congress: who funds their campaigns, what stocks they trade, how they vote and who lobbies them. Free, nonpartisan, built on public records."
      ogDesc="Look up any member of Congress: who funds them, what stocks they trade, how they vote and who lobbies them." />
  );
}
