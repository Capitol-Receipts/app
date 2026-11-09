// Same handler as before the move to Next.js; it lives in api/face.js.
import handler from '../../api/face';
import { legacy } from '../../lib/legacy';
export default legacy('face', handler);
export const config = {"api": {"responseLimit": false}};
