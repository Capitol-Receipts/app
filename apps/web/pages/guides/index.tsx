import type { GetServerSideProps } from 'next';
import Entry from '../../components/seo/Entry';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { seoProps } = require('../../lib/seo-ssp');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const GD = require('../../server/_seo_guides');

export const config = { unstable_runtimeJS: false };
export const getServerSideProps: GetServerSideProps = (ctx) => seoProps(ctx, 'guides', { hub: () => GD.hub() });
export default Entry;
