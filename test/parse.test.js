import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProposal, parseBio, titleFromPath } from '../src/lib/parse.js';

test('title from first heading, body is the rest', () => {
  const p = parseProposal('# My Talk\n\nFirst para.\n\nSecond para.\n', 'my-talk.md');
  assert.equal(p.title, 'My Talk');
  assert.equal(p.body, 'First para.\n\nSecond para.');
  assert.equal(p.intro, p.body);
  assert.deepEqual(p.sections, []);
});

test('subsections become copyable sections', () => {
  const md = '## Block__Element--Magic\n\n### Abstract\nShort.\n\n### Description\nLong.\n\nMore.\n';
  const p = parseProposal(md, 'bem.md');
  assert.equal(p.title, 'Block__Element--Magic');
  assert.equal(p.intro, '');
  assert.equal(p.body, '### Abstract\nShort.\n\n### Description\nLong.\n\nMore.');
  assert.deepEqual(p.sections, [
    { heading: 'Abstract', content: 'Short.' },
    { heading: 'Description', content: 'Long.\n\nMore.' },
  ]);
});

test('file with no heading uses the file name as title', () => {
  const p = parseProposal('Just text.\r\n', 'wkshps/short-bio.md');
  assert.equal(p.title, 'Short Bio');
  assert.equal(p.body, 'Just text.');
});

test('heading-only file has empty body', () => {
  const p = parseProposal('# CI, CD, and CA Oh My!\n', 'axe-ci.md');
  assert.equal(p.title, 'CI, CD, and CA Oh My!');
  assert.equal(p.body, '');
});

test('headings inside code fences are ignored', () => {
  const p = parseProposal('# Title\n\n```sh\n# a comment\n```\n', 'x.md');
  assert.deepEqual(p.sections, []);
  assert.equal(p.body, '```sh\n# a comment\n```');
});

test('bio file splits into entries per heading', () => {
  const entries = parseBio('# Long Bio\nLong.\n\n# Short Bio\nShort.\n\n# Empty\n', 'bio.md');
  assert.deepEqual(entries, [
    { heading: 'Long Bio', content: 'Long.' },
    { heading: 'Short Bio', content: 'Short.' },
  ]);
  assert.deepEqual(parseBio('Plain bio.', 'short-bio.md'), [{ heading: 'Short Bio', content: 'Plain bio.' }]);
});

test('titleFromPath', () => {
  assert.equal(titleFromPath('ideas/node_modules-iceberg.md'), 'Node Modules Iceberg');
});
