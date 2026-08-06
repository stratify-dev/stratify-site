import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from '../build.mjs';

let out;

before(async () => {
  out = await mkdtemp(path.join(tmpdir(), 'stratify-site-'));
  await build({ outDir: out, version: 'v9.9.9' });
});

test('copies the landing page', async () => {
  const html = await readFile(path.join(out, 'index.html'), 'utf8');
  assert.match(html, /One binary\. Six languages\. Six analyses\./);
});

test('copies the stylesheet', async () => {
  const files = await readdir(out);
  assert.ok(files.includes('styles.css'), `styles.css missing from ${files.join(', ')}`);
});

test('copies assets', async () => {
  const files = await readdir(path.join(out, 'assets'));
  assert.ok(files.includes('favicon.svg'));
});

test('copies CNAME verbatim', async () => {
  const cname = await readFile(path.join(out, 'CNAME'), 'utf8');
  assert.equal(cname.trim(), 'stratify.dynaum.com');
});
