// Same handler as before the move to Next.js; it lives in api/cimg.js.
import handler from '../../api/cimg';
import { legacy } from '../../lib/legacy';
export default legacy('cimg', handler);
export const config = {"api": {"responseLimit": false}};
