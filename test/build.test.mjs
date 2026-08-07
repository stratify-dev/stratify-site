import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build, applyTokens, resolveVersion, FALLBACK_VERSION } from '../build.mjs';

let out;

const textOf = (html) => html.replace(/<[^>]+>/g, '');

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

test('renders each content file to its own docs page', async () => {
  const html = await readFile(path.join(out, 'docs', 'install', 'index.html'), 'utf8');
  assert.match(html, /<h1>Install &amp; quick start<\/h1>/);
  assert.match(textOf(html), /brew install stratify-dev\/tap\/stratify/);
  assert.match(html, /<h2 id="install">Install<\/h2>/);
});

test('reports built pages in order', async () => {
  const result = await build({ outDir: await mkdtemp(path.join(tmpdir(), 'stratify-order-')), version: 'v9.9.9' });
  const orders = result.pages.map((p) => p.order);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  assert.ok(result.pages.some((p) => p.slug === 'install'));
});

test('highlights code blocks at build time with both themes', async () => {
  const html = await readFile(path.join(out, 'docs', 'install', 'index.html'), 'utf8');
  assert.match(html, /class="shiki/);
  assert.match(html, /--shiki-light:/);
  assert.match(html, /--shiki-dark:/);
});

test('ships no highlighting runtime', async () => {
  const html = await readFile(path.join(out, 'docs', 'install', 'index.html'), 'utf8');
  assert.ok(!html.includes('shiki.js'), 'client-side shiki bundle leaked into the page');
});

const SLUGS = ['install', 'analyses', 'ci', 'integrations'];

test('every docs page carries the full sidebar', async () => {
  for (const slug of SLUGS) {
    const html = await readFile(path.join(out, 'docs', slug, 'index.html'), 'utf8');
    for (const other of SLUGS) {
      assert.match(html, new RegExp(`href="/docs/${other}/"`), `${slug} is missing a link to ${other}`);
    }
    const marked = [...html.matchAll(/<a href="\/docs\/([^"/]+)\/" aria-current="page">/g)].map((m) => m[1]);
    assert.deepEqual(marked, [slug], `${slug} should be the only page marked current`);
  }
});

test('lists on-page anchors', async () => {
  const html = await readFile(path.join(out, 'docs', 'install', 'index.html'), 'utf8');
  assert.match(html, /href="#install"/);
  assert.match(html, /href="#first-scan"/);
});

test('links previous and next pages', async () => {
  const first = await readFile(path.join(out, 'docs', 'install', 'index.html'), 'utf8');
  assert.ok(!first.includes('rel="prev"'), 'first page should have no previous link');
  assert.match(first, /<a class="next" rel="next" href="\/docs\/analyses\/">/);

  const last = await readFile(path.join(out, 'docs', 'integrations', 'index.html'), 'utf8');
  assert.match(last, /<a class="prev" rel="prev" href="\/docs\/ci\/">/);
  assert.ok(!last.includes('rel="next"'), 'last page should have no next link');
});

import { stat } from 'node:fs/promises';

async function htmlFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) found.push(full);
  }
  return found;
}

const exists = async (p) => stat(p).then(() => true, () => false);

const SLOTS = ['HEAD-SCRIPTS', 'NAV', 'FOOT', 'SIDEBAR', 'CONTENT', 'ANCHORS', 'PREVNEXT'];

test('no unresolved tokens or slots survive anywhere', async () => {
  for (const file of await htmlFiles(out)) {
    const text = await readFile(file, 'utf8');
    const rel = path.relative(out, file);
    assert.ok(!text.includes('{{'), `unresolved token in ${rel}`);
    for (const slot of SLOTS) {
      assert.ok(!text.includes(`<!--${slot}-->`), `unfilled ${slot} slot in ${rel}`);
    }
  }
});

test('every same-origin link and asset reference resolves', async () => {
  const problems = [];
  for (const file of await htmlFiles(out)) {
    const html = await readFile(file, 'utf8');
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const [, href] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:|tel:|data:)/.test(href)) continue;
      if (href.startsWith('#')) {
        if (href !== '#' && !ids.has(href.slice(1))) problems.push(`${path.relative(out, file)} -> ${href}`);
        continue;
      }
      const clean = href.split('#')[0].split('?')[0];
      if (clean === '') continue;
      const target = path.join(out, clean.replace(/^\//, ''));
      const ok = (await exists(target)) || (await exists(path.join(target, 'index.html')));
      if (!ok) problems.push(`${path.relative(out, file)} -> ${href}`);
    }
  }
  assert.deepEqual(problems, [], `broken links:\n${problems.join('\n')}`);
});
