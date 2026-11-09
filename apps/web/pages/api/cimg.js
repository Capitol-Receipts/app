// Same handler as before the move to Next.js; it lives in server/cimg.js.
import handler from '../../server/cimg';
import { legacy } from '../../lib/legacy';
export default legacy('cimg', handler);
export const config = {"api": {"responseLimit": false}};
