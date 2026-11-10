import type { GetServerSideProps } from 'next';
import Entry from '../components/seo/Entry';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { seoGeneric } = require('../lib/seo-ssp');

/* Every record and directory page (members, bills, votes, stocks, rankings, Spanish pages...). Visitors never see this
   address: the rewrites in routes.json send /member/<id>/<name> and the rest here with ?t=member&id=... */
export const config = { unstable_runtimeJS: false };
export const getServerSideProps: GetServerSideProps = (ctx) => seoGeneric(ctx);
export default Entry;
