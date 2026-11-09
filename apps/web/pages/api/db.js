// Same handler as before the move to Next.js; it lives in server/db.js.
import handler from '../../server/db';
import { legacy } from '../../lib/legacy';
export default legacy('db', handler);
export const config = {"api": {"responseLimit": false}, "maxDuration": 60};
