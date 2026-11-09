// The API handlers were written for Vercel functions, where a rewritten request arrives with req.url set to the
// rewrite's destination (/api/seo?t=member&id=...). Next.js keeps the visitor's URL in req.url and puts the
// destination's parameters in req.query, so rebuild req.url the old way before calling the handler.
export function legacy(name, handler) {
  return function wrapped(req, res) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query || {})) for (const x of [].concat(v)) q.append(k, x);
    const s = q.toString();
    req.url = `/api/${name}${s ? '?' + s : ''}`;
    return handler(req, res);
  };
}
