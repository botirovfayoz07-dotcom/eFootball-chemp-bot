'use strict';
// Norasmiy turnir: qura vaqti sozlamasi (DB talab qilinmaydi)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('norasmiy turnir yaratilganda qura 15 daqiqaga qo\'yiladi', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'unofficial.js'), 'utf8');
  assert.match(src, /const UT_AUTO_DRAW_MIN = 15;/);
  assert.match(src, /drawAt: new Date\(Date\.now\(\) \+ UT_AUTO_DRAW_MIN \* 60 \* 1000\)/);
});

test('ishtirokchi yetmasa qura o\'chirilmaydi, qayta rejalashtiriladi', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'unofficial.js'), 'utf8');
  assert.match(src, /if \(r\.error === 'few'\) \{/);
});
