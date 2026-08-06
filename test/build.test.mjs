import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build, applyTokens, resolveVersion, FALLBACK_VERSION } from '../build.mjs';

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

test('substitutes scalar tokens', () => {
  assert.equal(applyTokens('use @{{VERSION}} now', { VERSION: 'v1.2.3' }), 'use @v1.2.3 now');
});

test('throws on an unknown token', () => {
  assert.throws(() => applyTokens('{{NOPE}}', { VERSION: 'v1.2.3' }), /NOPE/);
});

test('resolves the version into the landing page', async () => {
  const html = await readFile(path.join(out, 'index.html'), 'utf8');
  assert.match(html, /stratify-dev\/stratify@v9\.9\.9/);
  assert.ok(!html.includes('{{'), 'unresolved token left in index.html');
});

async function withStubbedLookup(fetchStub, fn) {
  const realFetch = globalThis.fetch;
  const realWrite = process.stderr.write;
  const savedEnv = process.env.STRATIFY_VERSION;
  const stderr = [];
  delete process.env.STRATIFY_VERSION;
  globalThis.fetch = fetchStub;
  process.stderr.write = (chunk) => {
    stderr.push(String(chunk));
    return true;
  };
  try {
    return { value: await fn(), stderr: stderr.join('') };
  } finally {
    globalThis.fetch = realFetch;
    process.stderr.write = realWrite;
    if (savedEnv === undefined) delete process.env.STRATIFY_VERSION;
    else process.env.STRATIFY_VERSION = savedEnv;
  }
}

test('falls back when the lookup rejects', async () => {
  const { value, stderr } = await withStubbedLookup(() => Promise.reject(new Error('offline')), resolveVersion);
  assert.equal(value, FALLBACK_VERSION);
  assert.match(stderr, /warn: version lookup failed \(offline\)/);
});

test('falls back on a non-ok response', async () => {
  const { value, stderr } = await withStubbedLookup(() => Promise.resolve({ ok: false, status: 503 }), resolveVersion);
  assert.equal(value, FALLBACK_VERSION);
  assert.match(stderr, /503/);
});

test('falls back on a malformed tag_name', async () => {
  const { value, stderr } = await withStubbedLookup(
    () => Promise.resolve({ ok: true, json: () => Promise.resolve({ tag_name: 'latest' }) }),
    resolveVersion,
  );
  assert.equal(value, FALLBACK_VERSION);
  assert.match(stderr, /unexpected tag_name/);
});

test('STRATIFY_VERSION short-circuits the lookup', async () => {
  const savedEnv = process.env.STRATIFY_VERSION;
  const realFetch = globalThis.fetch;
  process.env.STRATIFY_VERSION = 'v1.2.3';
  globalThis.fetch = () => {
    throw new Error('the network must not be touched when the env var is set');
  };
  try {
    assert.equal(await resolveVersion(), 'v1.2.3');
  } finally {
    globalThis.fetch = realFetch;
    if (savedEnv === undefined) delete process.env.STRATIFY_VERSION;
    else process.env.STRATIFY_VERSION = savedEnv;
  }
});

test('a malformed token throws instead of surviving', () => {
  assert.throws(() => applyTokens('{{ VERSION }}', { VERSION: 'v1.2.3' }), /VERSION/);
});
