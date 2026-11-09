// Every search box uses app/js/fuzzy.js. It is a browser script, so it is loaded into a sandbox here.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps/web/public/app/js/fuzzy.js'), 'utf8') + '\n;globalThis.__fz={fzScore,fz,fzFold};', ctx);
const { fzScore, fz, fzFold } = ctx.__fz;

test('folds case, accents and punctuation', () => {
  assert.equal(fzFold('Luján, Ben Ray'), 'lujan ben ray');
  assert.equal(fzFold("O'Rourke"), 'orourke');
});

test('finds members despite typos, nicknames and word order', () => {
  assert.ok(fz('Nancy Pelosi', 'pelosy'));
  assert.ok(fz('Charles E. Schumer', 'chuck schumer'));
  assert.ok(fz('Bernard Sanders', 'bernie'));
  assert.ok(fz('Alexandria Ocasio-Cortez', 'ocasio cortes'));
  assert.ok(fz('Mitch McConnell', 'mc connell'));
  assert.ok(fz('Ron DeSantis', 'desantis'));
});

test('does not match unrelated names', () => {
  assert.ok(!fz('Nancy Pelosi', 'schumer'));
  assert.ok(!fz('Mitch McConnell', 'warren'));
});

test('a closer match scores higher', () => {
  assert.ok(fzScore('Nancy Pelosi', 'pelosi') > fzScore('Nancy Pelosi', 'pelosy'));
});
