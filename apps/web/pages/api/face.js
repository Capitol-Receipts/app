// Same handler as before the move to Next.js; it lives in server/face.js.
import handler from '../../server/face';
import { legacy } from '../../lib/legacy';
export default legacy('face', handler);
export const config = {"api": {"responseLimit": false}};
