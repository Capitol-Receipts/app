// Same handler as before the move to Next.js; it lives in server/sentry-test.js.
import handler from '../../server/sentry-test';
import { legacy } from '../../lib/legacy';
export default legacy('sentry-test', handler);
export const config = {"api": {"responseLimit": false}};
