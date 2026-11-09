// Finds a file shipped with the web app. On Vercel the functions run from the repo root (/var/task), locally and in
// tests from apps/web, and before the monorepo move from the old root: try each so the same code works everywhere.
const fs = require('fs');
const path = require('path');
module.exports = function here(...parts) {
  const roots = [path.join(process.cwd(), 'apps', 'web'), process.cwd()];
  for (const r of roots) { const p = path.join(r, ...parts); if (fs.existsSync(p)) return p; }
  return path.join(roots[1], ...parts);
};
