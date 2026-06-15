import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../js/log.js', import.meta.url), 'utf8');

// Find every .modal-footer block and check that btn-danger precedes btn-primary.
// This guards the DOM order required by the spec (WCAG 1.3.2 / 2.4.3):
// destructive button must be the first child, Save must be the second.
const footerPattern = /class="modal-footer">([\s\S]*?)<\/div>/g;
const footers = [...src.matchAll(footerPattern)];

assert.ok(footers.length > 0, 'at least one .modal-footer block found in log.js');

for (const [, content] of footers) {
  const dangerPos  = content.indexOf('btn-danger');
  const primaryPos = content.indexOf('btn-primary');
  assert.ok(dangerPos  !== -1, 'modal-footer contains a btn-danger button');
  assert.ok(primaryPos !== -1, 'modal-footer contains a btn-primary button');
  assert.ok(
    dangerPos < primaryPos,
    `btn-danger must appear before btn-primary in .modal-footer (destructive-leading DOM order)`
  );
}

console.log('test-log-footer: all assertions passed');
