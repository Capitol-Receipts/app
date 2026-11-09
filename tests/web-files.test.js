// The record pages and share images read files from disk. On Vercel the code runs from the repo root, so a path
// built from the working folder alone breaks every record page (Nov 9, 2026). Check both places resolve.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const here = require('../apps/web/server/_here');

for (const cwd of [path.resolve('.'), path.resolve('apps/web')]) {
  test(`files resolve when running from ${path.relative(process.cwd(), cwd) || 'repo root'}`, () => {
    const was = process.cwd();
    try {
      process.chdir(cwd);
      assert.ok(fs.existsSync(here('public', 'index.html')));
      assert.ok(fs.existsSync(here('server', '_fonts', 'Barlow-Medium.ttf')));
    } finally { process.chdir(was); }
  });
}
