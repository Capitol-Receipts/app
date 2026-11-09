// Same handler as before the move to Next.js; it lives in server/app-version.js.
import handler from '../../server/app-version';
import { legacy } from '../../lib/legacy';
export default legacy('app-version', handler);
export const config = {"api": {"responseLimit": false}};
