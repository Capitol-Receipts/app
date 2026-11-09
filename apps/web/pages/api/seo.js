// Same handler as before the move to Next.js; it lives in api/seo.js.
import handler from '../../api/seo';
import { legacy } from '../../lib/legacy';
export default legacy('seo', handler);
export const config = {"api": {"responseLimit": false}, "maxDuration": 30};
