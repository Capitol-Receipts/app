// Same handler as before the move to Next.js; it lives in api/og.js.
import handler from '../../api/og';
import { legacy } from '../../lib/legacy';
export default legacy('og', handler);
export const config = {"api": {"responseLimit": false}, "maxDuration": 30};
