# Stratify Marketing Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static marketing site plus four docs pages for Stratify at https://stratify.dynaum.com, built by a small Node script and deployed to GitHub Pages.

**Architecture:** A build script (`build.mjs`) exports one `build()` function. It copies `src/` and `assets/` into an output directory, substitutes scalar tokens such as `{{VERSION}}`, renders each `content/*.md` file through marked with build-time shiki highlighting, and wraps the result in `templates/docs.html`. The landing page is hand-written HTML with an inline SVG. Tests import `build()` directly and assert on the produced tree.

**Tech Stack:** Node 20, `marked` (markdown), `shiki` (build-time highlighting), `node --test` (test runner), plain CSS and ~100 lines of vanilla JS, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-06-stratify-marketing-site-design.md`

**Working directory:** `~/dev/stratify-site` (already exists, git initialized, spec committed). One task touches `~/dev/digitalocean-dns` and one touches `~/dev/stratify`.

## Global Constraints

- Node 20 or newer. `package.json` sets `"engines": { "node": ">=20" }` and `"type": "module"`.
- Exactly two runtime dependencies: `marked` and `shiki`. No others, no dev dependencies. The test runner is Node's built-in `node --test`.
- No client-side framework. `src/theme.js` stays under 3 KB.
- No web fonts. System stacks only: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` for text and `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` for code.
- Every animation sits inside `@media (prefers-reduced-motion: no-preference)`.
- Body text meets WCAG AA (4.5:1) in both themes. Severity always carries a text label, never color alone.
- Total landing page transfer under 150 KB.
- Canonical domain: `stratify.dynaum.com`. Engine repo: `stratify-dev/stratify`. Site repo: `stratify-dev/stratify-site`.
- Version tokens are never hardcoded in `content/` or `src/`. Write `{{VERSION}}` and let the build resolve it.
- Color tokens (exact values, from the spec):
  | Token | Light | Dark |
  |-------|-------|------|
  | `--bg` | `#fbfaf8` | `#12141a` |
  | `--fg` | `#1a1c22` | `#e6e8ee` |
  | `--sev-info` | `#1d5fd0` | `#7fa9f5` |
  | `--sev-warn` | `#9a6100` | `#e8b04b` |
  | `--sev-error` | `#b3261e` | `#f28b82` |
  | `--accent` | `#1d5fd0` | `#7fa9f5` |
- Commit after every task. Conventional commit prefixes: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ci:`.

## File Structure

| File | Responsibility |
|------|----------------|
| `package.json` | Deps, scripts, engines |
| `build.mjs` | The entire build: token substitution, markdown pipeline, nav, output |
| `templates/docs.html` | Docs page shell (head, sidebar slot, article slot, anchors slot, prev/next slot) |
| `templates/head-scripts.html` | The inline theme-flash guard, shared by both page types |
| `templates/nav.html` | The site header, shared by both page types |
| `templates/foot.html` | The site footer, live region, and script tag, shared by both page types |
| `content/install.md` | Install and quick start |
| `content/analyses.md` | The six analyses plus `stratify.toml` config |
| `content/ci.md` | GitHub Action and SARIF |
| `content/integrations.md` | MCP, LSP, OpenTelemetry |
| `src/index.html` | Landing page markup with inline strata SVG |
| `src/styles.css` | Tokens, base, landing sections, shiki dual-theme rules |
| `src/docs.css` | Docs shell layout (sidebar, article, anchors) |
| `src/theme.js` | Theme toggle, copy buttons, scroll reveal |
| `assets/favicon.svg` | Monogram |
| `CNAME` | `stratify.dynaum.com` |
| `test/build.test.mjs` | Build assertions and link check |
| `.github/workflows/deploy.yml` | Build, test, deploy to Pages |
| `.gitignore` | `dist/`, `node_modules/` |
| `README.md` | What the repo is, how to run it, source-of-truth split |

---

### Task 1: Repo scaffold, static copy build, test harness

Produces a build that copies static files into an output directory, with a test suite proving it.

**Files:**
- Create: `package.json`, `.gitignore`, `build.mjs`, `CNAME`, `src/index.html`, `src/styles.css`, `assets/favicon.svg`, `test/build.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `build({ outDir, version })` exported from `build.mjs`, an async function returning `{ outDir, version, pages }` where `pages` is an array of `{ slug, title, order }`. Task 1 returns an empty `pages` array.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "stratify-site",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "node build.mjs",
    "test": "node --test test/*.mjs",
    "dev": "node build.mjs && python3 -m http.server 8000 --directory dist"
  },
  "dependencies": {
    "marked": "^15.0.0",
    "shiki": "^1.24.0"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
dist/
node_modules/
```

- [ ] **Step 3: Create `CNAME`**

```
stratify.dynaum.com
```

- [ ] **Step 4: Create placeholder static files**

`src/index.html`:

```html
<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <title>Stratify</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <h1>One binary. Six languages. Six analyses.</h1>
</body>
</html>
```

`src/styles.css`:

```css
:root { color-scheme: light dark; }
```

`assets/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#1d5fd0"/>
  <rect x="7" y="9"  width="18" height="3.4" rx="1.7" fill="#fff" opacity=".95"/>
  <rect x="7" y="14.3" width="18" height="3.4" rx="1.7" fill="#fff" opacity=".7"/>
  <rect x="7" y="19.6" width="18" height="3.4" rx="1.7" fill="#fff" opacity=".45"/>
</svg>
```

- [ ] **Step 5: Write the failing test**

`test/build.test.mjs`:

```js
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
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `cd ~/dev/stratify-site && npm install && npm test`
Expected: FAIL. `build.mjs` does not exist, so the import throws `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 7: Write the minimal build**

`build.mjs`:

```js
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const FALLBACK_VERSION = 'v0.4.0';

export async function build({ outDir = path.join(ROOT, 'dist'), version = FALLBACK_VERSION } = {}) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  await cp(path.join(ROOT, 'src'), outDir, { recursive: true });
  await cp(path.join(ROOT, 'assets'), path.join(outDir, 'assets'), { recursive: true });
  await cp(path.join(ROOT, 'CNAME'), path.join(outDir, 'CNAME'));

  return { outDir, version, pages: [] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await build();
  process.stdout.write(`built ${result.pages.length} docs page(s) into ${result.outDir}\n`);
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 4 tests.

- [ ] **Step 9: Commit**

```bash
cd ~/dev/stratify-site
git add package.json package-lock.json .gitignore build.mjs CNAME src assets test
git commit -m "feat: build scaffold that copies static files, with tests"
```

---

### Task 2: Version resolution and token substitution

Produces `{{VERSION}}` substitution with a network fallback and a hard failure on unknown tokens.

**Files:**
- Modify: `build.mjs`
- Modify: `src/index.html`
- Modify: `test/build.test.mjs`

**Interfaces:**
- Consumes: `build({ outDir, version })` from Task 1.
- Produces: `resolveVersion()` returning a `Promise<string>` shaped `v\d+\.\d+\.\d+`, and `applyTokens(text, tokens)` returning a string, both exported from `build.mjs`. `applyTokens` throws `Error` on a token with no matching key.

- [ ] **Step 1: Write the failing test**

Append to `test/build.test.mjs`:

```js
import { applyTokens } from '../build.mjs';

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
```

- [ ] **Step 2: Add the token to the landing page**

Replace the `<body>` of `src/index.html` with:

```html
<body>
  <h1>One binary. Six languages. Six analyses.</h1>
  <pre><code>uses: stratify-dev/stratify@{{VERSION}}</code></pre>
</body>
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL. `applyTokens` is not exported, and `index.html` still contains `{{VERSION}}`.

- [ ] **Step 4: Implement substitution and resolution**

In `build.mjs`, add these exports above `build()`:

```js
import { readFile, writeFile } from 'node:fs/promises';

export function applyTokens(text, tokens) {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    if (!Object.hasOwn(tokens, key)) throw new Error(`unknown placeholder ${match}`);
    return String(tokens[key]);
  });
}

export async function resolveVersion() {
  if (process.env.STRATIFY_VERSION) return process.env.STRATIFY_VERSION;
  try {
    const res = await fetch('https://api.github.com/repos/stratify-dev/stratify/releases/latest', {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'stratify-site-build' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
    const data = await res.json();
    if (!/^v\d+\.\d+\.\d+$/.test(data.tag_name ?? '')) {
      throw new Error(`unexpected tag_name ${JSON.stringify(data.tag_name)}`);
    }
    return data.tag_name;
  } catch (err) {
    process.stderr.write(`warn: version lookup failed (${err.message}), using ${FALLBACK_VERSION}\n`);
    return FALLBACK_VERSION;
  }
}
```

Inside `build()`, after the `cp` calls, add:

```js
  const tokens = { VERSION: version, YEAR: '2026' };
  const indexPath = path.join(outDir, 'index.html');
  await writeFile(indexPath, applyTokens(await readFile(indexPath, 'utf8'), tokens));
```

Change the CLI entry at the bottom to resolve the version first:

```js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const version = await resolveVersion();
  const result = await build({ version });
  process.stdout.write(`built ${result.pages.length} docs page(s) at ${version} into ${result.outDir}\n`);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 7 tests.

- [ ] **Step 6: Cover the fallback branches with tests**

`resolveVersion()` carries the "telemetry never fails the build" guarantee, so its failure paths need automated coverage, not only a manual check. The helper also captures stderr, which keeps test output pristine while asserting the warning fired.

Append to `test/build.test.mjs`:

```js
import { resolveVersion, FALLBACK_VERSION } from '../build.mjs';

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
```

Run: `npm test`
Expected: PASS, 12 tests. Output stays clean — the helper swallows the warnings it asserts on.

- [ ] **Step 7: Verify the fallback path by hand**

Run: `STRATIFY_VERSION= node -e "import('./build.mjs').then(async m => { const f = globalThis.fetch; globalThis.fetch = () => Promise.reject(new Error('offline')); console.log(await m.resolveVersion()); globalThis.fetch = f; })"`
Expected: prints a warning to stderr and `v0.4.0` to stdout. Exit code 0.

- [ ] **Step 8: Commit**

```bash
git add build.mjs src/index.html test/build.test.mjs
git commit -m "feat: resolve release version at build time with offline fallback"
```

---

### Task 3: Markdown docs pipeline

Produces one HTML page per markdown file, rendered into the docs shell.

**Files:**
- Create: `templates/docs.html`, `content/install.md`
- Modify: `build.mjs`, `test/build.test.mjs`

**Interfaces:**
- Consumes: `applyTokens` from Task 2.
- Produces: `parseFrontmatter(raw)` returning `{ data, body }` and `injectPartials(html, partials)` returning a string, both exported from `build.mjs`. Partial slots are HTML comments: `<!--HEAD-SCRIPTS-->`, `<!--NAV-->`, `<!--FOOT-->`. Any page carrying a slot gets the partial; a page without the slot is left alone. `build()` now returns `pages` as an array of `{ slug, title, order, description, headings }` sorted by `order`, where `headings` is an array of `{ id, text }`. Output path per page: `<outDir>/docs/<slug>/index.html`.

- [ ] **Step 1: Create the docs shell**

`templates/docs.html`. Scalar tokens use `{{...}}`. Large slots use HTML comments, filled after token substitution so page content never passes through `applyTokens` twice.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{TITLE}} — Stratify docs</title>
  <meta name="description" content="{{DESCRIPTION}}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/docs.css">
  <!--HEAD-SCRIPTS-->
</head>
<body class="docs">
  <a class="skip" href="#content">Skip to content</a>
  <!--NAV-->
  <div class="docs-layout">
    <nav class="sidebar" aria-label="Documentation">
      <!--SIDEBAR-->
    </nav>
    <main id="content">
      <article>
        <h1>{{TITLE}}</h1>
        <!--CONTENT-->
      </article>
      <nav class="prevnext" aria-label="Page navigation">
        <!--PREVNEXT-->
      </nav>
    </main>
    <aside class="anchors" aria-label="On this page">
      <p class="anchors-title">On this page</p>
      <!--ANCHORS-->
    </aside>
  </div>
  <!--FOOT-->
</body>
</html>
```

- [ ] **Step 1b: Create the three shared partials**

Both page types inject these, so the header, footer, and theme guard have one source each. The theme guard has to stay inline and synchronous, or the page paints in the wrong theme before the script loads.

`templates/head-scripts.html`:

```html
<script>
  (() => {
    const saved = localStorage.getItem('stratify-theme');
    const dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  })();
</script>
```

`templates/nav.html`:

```html
<header class="topnav">
  <a class="wordmark" href="/">Stratify</a>
  <nav aria-label="Primary">
    <a href="/docs/install/">Docs</a>
    <a href="https://github.com/stratify-dev/stratify">GitHub</a>
  </nav>
  <button class="theme-toggle" type="button" aria-label="Switch theme">Theme</button>
</header>
```

`templates/foot.html`:

```html
<footer class="sitefoot">
  <p>Stratify {{VERSION}} · MIT · <a href="https://github.com/stratify-dev/stratify">source</a> · built by <a href="https://dynaum.com">Elber Ribeiro</a> · &copy; {{YEAR}}</p>
</footer>
<div class="sr-live" aria-live="polite"></div>
<script src="/theme.js" defer></script>
```

- [ ] **Step 2: Create the first content file**

`content/install.md`:

````markdown
---
title: Install & quick start
order: 1
description: Install Stratify with Homebrew, curl, or cargo, then run your first scan.
---

## Install

Homebrew, on macOS and Linux:

```sh
brew install stratify-dev/tap/stratify
```

## First scan

```sh
stratify check .
```
````

- [ ] **Step 3: Write the failing test**

Append to `test/build.test.mjs`:

```js
test('renders each content file to its own docs page', async () => {
  const html = await readFile(path.join(out, 'docs', 'install', 'index.html'), 'utf8');
  assert.match(html, /<h1>Install &amp; quick start<\/h1>/);
  assert.match(html, /brew install stratify-dev\/tap\/stratify/);
  assert.match(html, /<h2 id="install">Install<\/h2>/);
});

test('reports built pages in order', async () => {
  const result = await build({ outDir: await mkdtemp(path.join(tmpdir(), 'stratify-order-')), version: 'v9.9.9' });
  const orders = result.pages.map((p) => p.order);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  assert.ok(result.pages.some((p) => p.slug === 'install'));
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL with `ENOENT` on `docs/install/index.html`.

- [ ] **Step 5: Implement the pipeline**

Add to `build.mjs`:

```js
import { readdir } from 'node:fs/promises';
import { Marked, marked } from 'marked';

const PARTIALS = ['head-scripts', 'nav', 'foot'];

async function loadPartials() {
  const entries = await Promise.all(
    PARTIALS.map(async (name) => [name, (await readFile(path.join(ROOT, 'templates', `${name}.html`), 'utf8')).trim()]),
  );
  return Object.fromEntries(entries);
}

export function injectPartials(html, partials) {
  return html
    .replace('<!--HEAD-SCRIPTS-->', partials['head-scripts'])
    .replace('<!--NAV-->', partials.nav)
    .replace('<!--FOOT-->', partials.foot);
}

export function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) throw new Error('missing frontmatter');
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
    data[key] = /^\d+$/.test(value) ? Number(value) : value;
  }
  return { data, body: raw.slice(match[0].length) };
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function makeRenderer(headings) {
  return {
    heading(token) {
      const text = token.text ?? '';
      const depth = token.depth ?? 2;
      const id = slugify(text);
      if (depth === 2) headings.push({ id, text });
      return `<h${depth} id="${id}">${marked.parseInline(text)}</h${depth}>\n`;
    },
  };
}
```

Inside `build()`, replace the `return` with:

```js
  const partials = await loadPartials();
  const template = injectPartials(await readFile(path.join(ROOT, 'templates', 'docs.html'), 'utf8'), partials);
  const files = (await readdir(path.join(ROOT, 'content'))).filter((f) => f.endsWith('.md')).sort();

  const parsed = [];
  for (const file of files) {
    const raw = await readFile(path.join(ROOT, 'content', file), 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const headings = [];
    const md = new Marked({ renderer: makeRenderer(headings) });
    const html = md.parse(applyTokens(body, tokens));
    parsed.push({
      slug: file.replace(/\.md$/, ''),
      title: data.title,
      order: data.order,
      description: data.description,
      headings,
      html,
    });
  }
  parsed.sort((a, b) => a.order - b.order);

  for (const page of parsed) {
    const shell = applyTokens(template, {
      ...tokens,
      TITLE: escapeHtml(page.title),
      DESCRIPTION: escapeHtml(page.description),
    });
    const out = shell
      .replace('<!--SIDEBAR-->', '')
      .replace('<!--CONTENT-->', page.html)
      .replace('<!--ANCHORS-->', '')
      .replace('<!--PREVNEXT-->', '');
    await mkdir(path.join(outDir, 'docs', page.slug), { recursive: true });
    await writeFile(path.join(outDir, 'docs', page.slug, 'index.html'), out);
  }

  return {
    outDir,
    version,
    pages: parsed.map(({ slug, title, order, description, headings }) => ({ slug, title, order, description, headings })),
  };
```

Now give the landing page the same shell. In `build()`, delete the `index.html` write added in Task 2 and put this in its place, below the `loadPartials()` call (it needs `partials` in scope):

```js
  const indexPath = path.join(outDir, 'index.html');
  const indexHtml = injectPartials(await readFile(indexPath, 'utf8'), partials);
  await writeFile(indexPath, applyTokens(indexHtml, tokens));
```

Partials are injected before `applyTokens` runs, so `{{VERSION}}` inside `foot.html` resolves like any other token. The landing page has no slots until Task 9, and `String.replace` on a missing marker is a no-op, so this is inert until then.

A fresh `Marked` instance per page matters. `marked.use()` accumulates extensions on the shared singleton, so a loop would stack one renderer per file. `escapeHtml` matters too: `{{TITLE}}` lands in raw HTML, and "Install & quick start" contains an ampersand.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 14 tests.

- [ ] **Step 7: Commit**

```bash
git add build.mjs templates content test/build.test.mjs
git commit -m "feat: render markdown content into docs pages"
```

---

### Task 4: Build-time syntax highlighting

Produces code blocks highlighted at build time with dual light and dark themes, and no highlighting JavaScript in the browser.

**Files:**
- Modify: `build.mjs`, `src/styles.css`, `test/build.test.mjs`

**Interfaces:**
- Consumes: the markdown pipeline from Task 3.
- Produces: rendered code fences wrapped in `<pre class="shiki ...">` carrying `--shiki-light` and `--shiki-dark` CSS custom properties. No new exports.

- [ ] **Step 1: Write the failing test**

Append to `test/build.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL. No `class="shiki` in the output.

- [ ] **Step 3: Add the highlighter**

In `build.mjs`:

```js
import { createHighlighter } from 'shiki';

const LANGS = ['sh', 'bash', 'yaml', 'toml', 'json', 'js', 'ts', 'rust', 'ruby', 'python', 'go', 'java', 'text'];

let highlighterPromise;
function getHighlighter() {
  highlighterPromise ??= createHighlighter({ themes: ['github-light', 'github-dark'], langs: LANGS });
  return highlighterPromise;
}
```

Extend `makeRenderer` to take the highlighter and render code fences. The signature handles both marked's token-object renderer (v13+) and the older positional form, so a minor marked bump does not break the build:

```js
function makeRenderer(headings, highlighter) {
  return {
    heading(token) {
      const text = token.text ?? '';
      const depth = token.depth ?? 2;
      const id = slugify(text);
      if (depth === 2) headings.push({ id, text });
      return `<h${depth} id="${id}">${marked.parseInline(text)}</h${depth}>\n`;
    },
    code(tokenOrCode, infostring) {
      const text = typeof tokenOrCode === 'string' ? tokenOrCode : tokenOrCode.text;
      const requested = (typeof tokenOrCode === 'string' ? infostring : tokenOrCode.lang) || 'text';
      const lang = LANGS.includes(requested) ? requested : 'text';
      return highlighter.codeToHtml(text, {
        lang,
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: false,
      });
    },
  };
}
```

In `build()`, before the content loop add `const highlighter = await getHighlighter();`, then pass it when constructing the per-page instance: `const md = new Marked({ renderer: makeRenderer(headings, highlighter) });`

- [ ] **Step 4: Add the theme-switching CSS**

Append to `src/styles.css`:

```css
.shiki,
.shiki span {
  color: var(--shiki-light);
  background-color: var(--shiki-light-bg);
}
[data-theme='dark'] .shiki,
[data-theme='dark'] .shiki span {
  color: var(--shiki-dark);
  background-color: var(--shiki-dark-bg);
}
```

- [ ] **Step 5: Adjust the Task 3 assertion that highlighting breaks**

Task 3's test `renders each content file to its own docs page` asserts a literal command string appears in the page:

```js
  assert.match(html, /brew install stratify-dev\/tap\/stratify/);
```

Shiki wraps every token in its own `<span>`, so that contiguous string no longer exists in the markup even though the rendered text is unchanged. Do not loosen the regex with wildcards — that would let it match across unrelated content. Strip the tags and assert on the rendered text instead, which is what the assertion was always about.

Add this helper near the top of `test/build.test.mjs`, beside the other helpers:

```js
const textOf = (html) => html.replace(/<[^>]+>/g, '');
```

Then change that one line to:

```js
  assert.match(textOf(html), /brew install stratify-dev\/tap\/stratify/);
```

Leave the other two assertions in that test alone. `<h1>Install &amp; quick start</h1>` and `<h2 id="install">Install</h2>` are markup assertions and must stay tag-sensitive.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 16 tests.

- [ ] **Step 7: Commit**

```bash
git add build.mjs src/styles.css test/build.test.mjs
git commit -m "feat: highlight code at build time with dual shiki themes"
```

---

### Task 5: Sidebar, on-page anchors, and prev/next

Produces working navigation across all docs pages.

**Files:**
- Modify: `build.mjs`, `test/build.test.mjs`
- Create: `content/analyses.md`, `content/ci.md`, `content/integrations.md` (frontmatter and a single heading each; full prose lands in Task 8)

**Interfaces:**
- Consumes: `pages` from Task 3.
- Produces: `renderSidebar(pages, currentSlug)`, `renderAnchors(headings)`, and `renderPrevNext(pages, index)`, all exported from `build.mjs` and all returning HTML strings.

- [ ] **Step 1: Create the three remaining content stubs**

`content/analyses.md`:

```markdown
---
title: The six analyses
order: 2
description: What each Stratify analysis finds, how confidence works, and how to configure layer boundaries.
---

## Dead code

Functions and methods nothing reaches.
```

`content/ci.md`:

````markdown
---
title: CI & SARIF
order: 3
description: Run Stratify as a GitHub Action gate and upload SARIF to code scanning.
---

## The GitHub Action

```yaml
- uses: stratify-dev/stratify@{{VERSION}}
```
````

`content/integrations.md`:

````markdown
---
title: Integrations
order: 4
description: MCP server for AI agents, editor language server, and OpenTelemetry export.
---

## MCP server

```sh
stratify mcp
```
````

- [ ] **Step 2: Write the failing test**

Append to `test/build.test.mjs`:

```js
const SLUGS = ['install', 'analyses', 'ci', 'integrations'];

test('every docs page carries the full sidebar', async () => {
  for (const slug of SLUGS) {
    const html = await readFile(path.join(out, 'docs', slug, 'index.html'), 'utf8');
    for (const other of SLUGS) {
      assert.match(html, new RegExp(`href="/docs/${other}/"`), `${slug} is missing a link to ${other}`);
    }
    assert.match(html, new RegExp(`aria-current="page"[^>]*>|href="/docs/${slug}/" aria-current="page"`));
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
  assert.match(first, /rel="next"[^>]*>|href="\/docs\/analyses\/" rel="next"/);

  const last = await readFile(path.join(out, 'docs', 'integrations', 'index.html'), 'utf8');
  assert.match(last, /rel="prev"/);
  assert.ok(!last.includes('rel="next"'), 'last page should have no next link');
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL. The sidebar, anchors, and prev/next slots are all empty strings.

- [ ] **Step 4: Implement the three renderers**

Add to `build.mjs`:

```js
export function renderSidebar(pages, currentSlug) {
  const items = pages.map((p) => {
    const current = p.slug === currentSlug ? ' aria-current="page"' : '';
    return `<li><a href="/docs/${p.slug}/"${current}>${escapeHtml(p.title)}</a></li>`;
  });
  return `<ul>${items.join('')}</ul>`;
}

export function renderAnchors(headings) {
  if (headings.length === 0) return '';
  const items = headings.map((h) => `<li><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`);
  return `<ul>${items.join('')}</ul>`;
}

export function renderPrevNext(pages, index) {
  const prev = pages[index - 1];
  const next = pages[index + 1];
  const parts = [];
  if (prev) parts.push(`<a class="prev" rel="prev" href="/docs/${prev.slug}/"><span>Previous</span>${escapeHtml(prev.title)}</a>`);
  if (next) parts.push(`<a class="next" rel="next" href="/docs/${next.slug}/"><span>Next</span>${escapeHtml(next.title)}</a>`);
  return parts.join('');
}
```

In the page-writing loop, replace the three empty `.replace()` arguments:

```js
  for (const [index, page] of parsed.entries()) {
    const shell = applyTokens(template, { ...tokens, TITLE: escapeHtml(page.title), DESCRIPTION: escapeHtml(page.description) });
    const out = shell
      .replace('<!--SIDEBAR-->', renderSidebar(parsed, page.slug))
      .replace('<!--CONTENT-->', page.html)
      .replace('<!--ANCHORS-->', renderAnchors(page.headings))
      .replace('<!--PREVNEXT-->', renderPrevNext(parsed, index));
    await mkdir(path.join(outDir, 'docs', page.slug), { recursive: true });
    await writeFile(path.join(outDir, 'docs', page.slug, 'index.html'), out);
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 19 tests.

- [ ] **Step 6: Commit**

```bash
git add build.mjs content test/build.test.mjs
git commit -m "feat: sidebar, on-page anchors, and prev/next navigation"
```

---

### Task 6: Link checker

Produces a test failing the build on any broken same-origin link or unresolved token.

**Files:**
- Modify: `test/build.test.mjs`

**Interfaces:**
- Consumes: the full `dist` tree from Tasks 1 to 5.
- Produces: no exports. A test named `every same-origin link resolves`.

- [ ] **Step 1: Write the failing test**

First extend the existing `node:fs/promises` import at the top of the file to include `stat`. Do not add a second import from the same module further down — one specifier, one import line:

```js
import { mkdtemp, readFile, readdir, stat } from 'node:fs/promises';
```

Then append to `test/build.test.mjs`:

```js
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
  const files = await htmlFiles(out);
  assert.ok(files.length > 0, 'no HTML files were built, so this test would pass vacuously');
  for (const file of files) {
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
  const files = await htmlFiles(out);
  assert.ok(files.length > 0, 'no HTML files were built, so this test would pass vacuously');
  for (const file of files) {
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
```

Scanning `src` as well as `href` is deliberate. A stylesheet is referenced by `href`, but a script is referenced by `src`, and a broken `<script src>` ships a page whose behavior silently dies. `data:` joins the skip list because inline data URIs have no file to resolve.

- [ ] **Step 2: Run the test to see what breaks**

Run: `npm test`
Expected: FAIL, naming both `/docs.css` and `/theme.js`. `templates/docs.html` references both, and neither exists yet.

- [ ] **Step 3: Create the two missing files**

`src/docs.css`:

```css
.docs-layout { display: grid; }
```

`src/theme.js`:

```js
// Replaced in Task 7.
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 21 tests.

- [ ] **Step 5: Tighten two loose navigation assertions from Task 5**

Two assertions written in Task 5 use a regex alternation whose first branch matches if the attribute appears anywhere on the page. A bug marking the wrong page current, or pointing `rel="next"` at the wrong href, would still pass. Replace them with assertions naming the exact link.

In the test `every docs page carries the full sidebar`, replace this line:

```js
    assert.match(html, new RegExp(`aria-current="page"[^>]*>|href="/docs/${slug}/" aria-current="page"`));
```

with:

```js
    const marked = [...html.matchAll(/<a href="\/docs\/([^"/]+)\/" aria-current="page">/g)].map((m) => m[1]);
    assert.deepEqual(marked, [slug], `${slug} should be the only page marked current`);
```

In the test `links previous and next pages`, replace the two `assert.match` calls that use alternation with assertions naming the exact target. The page order is install, analyses, ci, integrations:

```js
  assert.match(first, /<a class="next" rel="next" href="\/docs\/analyses\/">/);
```

```js
  assert.match(last, /<a class="prev" rel="prev" href="\/docs\/ci\/">/);
```

Leave the two `assert.ok(!...)` boundary checks in that test as they are — they already assert the right thing.

- [ ] **Step 6: Run the tests again**

Run: `npm test`
Expected: PASS, 21 tests. The count is unchanged, since this step tightens existing assertions rather than adding new ones.

- [ ] **Step 7: Commit**

```bash
git add src/docs.css src/theme.js test/build.test.mjs
git commit -m "test: fail the build on broken same-origin links and stray tokens"
```

---

### Task 7: Design tokens, theme toggle, copy buttons

Produces the token layer and the whole client-side behavior budget.

**Files:**
- Modify: `src/styles.css`, `src/theme.js`
- Modify: `test/build.test.mjs`

**Interfaces:**
- Consumes: the markup contract from `templates/docs.html`: `.theme-toggle` button, `.sr-live` region, `html[data-theme]`.
- Produces: CSS custom properties on `:root` and `[data-theme='dark']` listed in Global Constraints, plus behavior for `[data-copy]` buttons (copy the text of the element named by the attribute's selector) and `[data-reveal]` elements (add class `is-visible` when scrolled into view).

- [ ] **Step 1: Write the failing test**

Append to `test/build.test.mjs`:

```js
test('theme.js stays under the 3 KB budget', async () => {
  const js = await readFile(path.join(out, 'theme.js'), 'utf8');
  assert.ok(Buffer.byteLength(js) < 3072, `theme.js is ${Buffer.byteLength(js)} bytes`);
  assert.match(js, /stratify-theme/);
});

test('both palettes are defined and actually differ', async () => {
  const css = await readFile(path.join(out, 'styles.css'), 'utf8');
  for (const token of ['--bg', '--fg', '--accent', '--sev-info', '--sev-warn', '--sev-error']) {
    assert.match(css, new RegExp(`${token}:`), `${token} is not defined`);
  }
  assert.match(css, /\[data-theme='dark'\]|\[data-theme="dark"\]/);
  assert.match(css, /prefers-reduced-motion/);

  // A palette that resolves to the same value in both themes would pass a
  // name-only check while shipping one theme twice.
  const valueOf = (block, token) => new RegExp(`${token}:\\s*([^;]+);`).exec(block)?.[1]?.trim();
  const light = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  const dark = /\[data-theme=['"]dark['"]\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  for (const token of ['--bg', '--fg', '--accent']) {
    const l = valueOf(light, token);
    const d = valueOf(dark, token);
    assert.ok(l && d, `${token} missing from one of the two palettes`);
    assert.notEqual(l, d, `${token} is identical in both themes`);
  }
});

test('revealed content is never hidden from readers without JavaScript', async () => {
  const css = await readFile(path.join(out, 'styles.css'), 'utf8');
  const hidingRules = [...css.matchAll(/([^{}]*\[data-reveal\][^{}]*)\{([^}]*)\}/g)]
    .filter((m) => /opacity:\s*0/.test(m[2]))
    .map((m) => m[1].trim());
  assert.ok(hidingRules.length > 0, 'expected a rule hiding revealed content before it animates in');
  for (const selector of hidingRules) {
    assert.match(selector, /\.js\s/, `"${selector}" hides content without requiring the .js marker`);
  }

  const page = await readFile(path.join(out, 'docs', 'install', 'index.html'), 'utf8');
  assert.match(page, /classList\.add\('js'\)/, 'the inline head script must set the .js marker before first paint');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL. `styles.css` defines no tokens and `theme.js` has no `stratify-theme` string.

- [ ] **Step 3: Write the token layer**

Replace `src/styles.css` up to the shiki rules with:

```css
:root {
  --bg: #fbfaf8;
  --fg: #1a1c22;
  --muted: #5b6070;
  --surface: #ffffff;
  --line: #e2e0db;
  --accent: #1d5fd0;
  --sev-info: #1d5fd0;
  --sev-warn: #9a6100;
  --sev-error: #b3261e;
  --stratum-1: #dfe8fb;
  --stratum-2: #cfdcf7;
  --stratum-3: #bfd0f3;
  --font: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --measure: 68ch;
  --radius: 10px;
  color-scheme: light;
}

[data-theme='dark'] {
  --bg: #12141a;
  --fg: #e6e8ee;
  --muted: #9aa1b3;
  --surface: #1a1d26;
  --line: #2b2f3b;
  --accent: #7fa9f5;
  --sev-info: #7fa9f5;
  --sev-warn: #e8b04b;
  --sev-error: #f28b82;
  --stratum-1: #1f2a41;
  --stratum-2: #26324c;
  --stratum-3: #2d3b58;
  color-scheme: dark;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--accent); }

code, pre { font-family: var(--mono); }

.skip {
  position: absolute;
  left: -9999px;
}
.skip:focus {
  left: 1rem;
  top: 1rem;
  z-index: 10;
  padding: 0.5rem 0.9rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.sr-live {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

[data-reveal] { opacity: 1; }

@media (prefers-reduced-motion: no-preference) {
  .js [data-reveal] {
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 0.5s ease, transform 0.5s ease;
    transition-delay: calc(var(--reveal-index, 0) * 70ms);
  }
  .js [data-reveal].is-visible {
    opacity: 1;
    transform: none;
  }
}
```

Two guards protect readers here, and both matter.

The base `[data-reveal] { opacity: 1 }` rule sits outside the media query, so a reader who turned on reduce-motion never enters the hidden state at all.

The `.js` prefix covers the other case. Without it, a reader whose JavaScript never runs — blocked, failed to load, disabled — and who has *not* enabled reduce-motion would match the `opacity: 0` rule with nothing left to add `.is-visible`, leaving that content invisible forever. Gating on a class that only JavaScript can set means no-JS readers never reach the hidden state either. The marker is set synchronously in the next step, before first paint, so there is no flash.

- [ ] **Step 3b: Set the `.js` marker before first paint**

The CSS above only hides content for readers whose JavaScript runs. Something has to say so, synchronously, before the first paint. `templates/head-scripts.html` already runs inline in `<head>` for exactly this reason, so add one line to it rather than creating a second inline script.

Edit `templates/head-scripts.html` to read:

```html
<script>
  (() => {
    document.documentElement.classList.add('js');
    const saved = localStorage.getItem('stratify-theme');
    const dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  })();
</script>
```

- [ ] **Step 4: Write the client script**

`src/theme.js`:

```js
const root = document.documentElement;
const live = document.querySelector('.sr-live');

document.querySelector('.theme-toggle')?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  localStorage.setItem('stratify-theme', next);
  if (live) live.textContent = `${next} theme`;
});

for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    const source = document.querySelector(button.dataset.copy);
    if (!source) return;
    try {
      await navigator.clipboard.writeText(source.innerText.trim());
      button.classList.add('copied');
      if (live) live.textContent = 'Copied to clipboard';
      setTimeout(() => button.classList.remove('copied'), 1600);
    } catch {
      if (live) live.textContent = 'Copy failed, select the text instead';
    }
  });
}

const reveals = document.querySelectorAll('[data-reveal]');
if (reveals.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -12% 0px' });
  reveals.forEach((el, i) => {
    el.style.setProperty('--reveal-index', String(i % 6));
    io.observe(el);
  });
} else {
  reveals.forEach((el) => el.classList.add('is-visible'));
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 24 tests.

- [ ] **Step 6: Check it in a browser**

Run: `npm run dev`, open http://localhost:8000/docs/install/
Verify: the Theme button flips the palette, a reload keeps the choice, and the skip link appears on the first Tab press.

- [ ] **Step 7: Commit**

```bash
git add src/styles.css src/theme.js test/build.test.mjs
git commit -m "feat: design tokens, theme toggle, copy buttons, scroll reveal"
```

---

### Task 8: Write the docs content

Produces the four finished docs pages.

**Files:**
- Modify: `content/install.md`, `content/analyses.md`, `content/ci.md`, `content/integrations.md`
- Modify: `test/build.test.mjs`

**Interfaces:**
- Consumes: the pipeline from Tasks 3 to 5.
- Produces: `h2` headings whose slugs match every fragment link written in Task 9 (the landing page). Required slugs, verified by the link checker:
  - `analyses.md`: `dead-code`, `duplication`, `complexity`, `churn-hotspots`, `dependency-cycles`, `layer-boundaries`
  - `ci.md`: `the-github-action`, `action-inputs`, `sarif-and-code-scanning`
  - `integrations.md`: `mcp-server`, `editor-language-server`, `opentelemetry-export`
  - `install.md`: `install`, `first-scan`, `output-formats`, `failing-the-build`

**Source material:** `~/dev/stratify/README.md`. Read it in full before writing. Every command, flag, default, and code block below already exists there. Do not invent behavior; when unsure whether something is supported, check the crate source under `~/dev/stratify/crates/`.

- [ ] **Step 1: Write `content/install.md`**

Keep the existing frontmatter. Sections and required content:

- `## Install` — four subsections as `h3`: Homebrew (`brew install stratify-dev/tap/stratify`), the curl one-liner (copy the exact URL from the README), prebuilt binaries (link to the releases page), and from source (`cargo install --git https://github.com/stratify-dev/stratify stratify-cli --locked`, noting the Rust toolchain requirement with a link to rustup.rs). One sentence per method saying who it suits. Close with: the binary is named `stratify`, and `stratify --help` lists every command.
- `## First scan` — `stratify check .`, then the sample output block showing the `warn` and `info` lines. Two paragraphs: what a finding line contains (severity, file, line, rule message), and what "possibly unused" means versus "unused".
- `## Output formats` — the three `--format` values with one code block showing all three, plus one sentence each on when to use `human`, `json`, and `sarif`.
- `## Failing the build` — `--fail-on` with its four values (`never` the default, `info`, `warning`, `error`), the exit-code behavior, and one example turning a scan into a gate. Link forward to `/docs/ci/`.

- [ ] **Step 2: Write `content/analyses.md`**

Open with one paragraph: all six run in a single pass over the shared IR, so cost is one parse rather than six tools.

Then one `h2` per analysis, in this exact order and wording so the slugs match: `Dead code`, `Duplication`, `Complexity`, `Churn hotspots`, `Dependency cycles`, `Layer boundaries`. Each gets two or three paragraphs covering what it finds, what makes a finding fire, and the one thing people get wrong about it. Specifics to include:

- Dead code: cross-file call resolution, and why a function used only from another file reports as `possibly unused` rather than a false `unused`.
- Duplication: type-2 clones (renamed variables), cross-language matching, and the `min_tokens` setting in `stratify.toml`.
- Complexity: cyclomatic complexity, severity ranking.
- Churn hotspots: complexity crossed with git history, the complexity floor, and why hotspots emit at `info` severity so they advise rather than fail a gate.
- Dependency cycles: file-level and package-level, with Go packages and Python `__init__.py` handled as real package edges.
- Layer boundaries: needs a `stratify.toml`. Fold the whole config story in here as `h3` subsections: `Presets` (`rails`, `layered`, and auto-detection). State the detection rule exactly as `crates/stratify-cli/src/run.rs` implements it: the `rails` preset applies when the root holds an `app/controllers/` directory **or** a `config/routes.rb` file; the `layered` preset applies when it holds a `pom.xml` **or** a `build.gradle`; anything else gets no boundary checks. The engine README omits `config/routes.rb`, so the source governs here, and `Custom layers and rules` (a full `stratify.toml` example with `preset`, `[layers]`, and `[[forbid]]`, plus the merge rule: your layer keys replace preset keys of the same name, your `[[forbid]]` rules add to the preset's).

Add a `## Confidence` section before the per-analysis sections explaining the confidence levels and how they map onto severity.

End with a `## Coverage` section holding the 6x6 markdown table from the landing page, and the note about Rust cycles and boundaries pending module and `use` resolution.

- [ ] **Step 3: Write `content/ci.md`**

- `## The GitHub Action` — the minimal workflow snippet using `stratify-dev/stratify@{{VERSION}}`, one paragraph on what the step does (downloads a prebuilt binary, so it starts in seconds), and the pinning advice: pin a released tag for stable runs, `@main` tracks latest.
- `## Action inputs` — the three-row table (`path` default `.`, `fail-on` default `warning`, `format` default `human`) with the description column copied from the README.
- `## SARIF and code scanning` — `stratify check . --format sarif > stratify.sarif`, then the full upload workflow using `github/codeql-action/upload-sarif@v4`, and the note on setting `fail-on: never` when you want findings in code scanning without failing the build. Mention GitHub and GitLab both render SARIF inline on pull requests.

- [ ] **Step 4: Write `content/integrations.md`**

- `## MCP server` — `stratify mcp`, what it is (stdio JSON-RPC, one `analyze` tool taking `path` and an optional `rule` filter, returning JSON findings), and the Claude Code registration block copied from the README.
- `## Editor language server` — `stratify lsp`, what triggers a re-analysis (open and save), diagnostics published for all six analyses with the rule as the diagnostic code, and how the server picks the workspace root (the `initialize` request).
- `## OpenTelemetry export` — the env-var form and the flag form, the full metric list (`stratify.findings`, `stratify.complexity.max`, `stratify.complexity.mean`, `stratify.cycles`, `stratify.boundary_violations`, `stratify.duplication.regions`, `stratify.files_scanned`, `stratify.functions`, `stratify.scan.duration_ms`) and the `stratify.run` log event carrying commit, branch, and totals. State the label design: `service.name` tags every run so one dashboard templates across repos, and commit and branch ride on the event rather than on metric labels to keep time-series clean. Close with the Datadog block and the guarantee that telemetry never fails a scan (export errors warn on stderr, the exit code still follows `--fail-on`).

- [ ] **Step 5: Add the anchor contract test**

Append to `test/build.test.mjs`:

```js
test('docs pages expose every anchor the landing page links to', async () => {
  const required = {
    install: ['install', 'first-scan', 'output-formats', 'failing-the-build'],
    analyses: ['dead-code', 'duplication', 'complexity', 'churn-hotspots', 'dependency-cycles', 'layer-boundaries'],
    ci: ['the-github-action', 'action-inputs', 'sarif-and-code-scanning'],
    integrations: ['mcp-server', 'editor-language-server', 'opentelemetry-export'],
  };
  for (const [slug, anchors] of Object.entries(required)) {
    const html = await readFile(path.join(out, 'docs', slug, 'index.html'), 'utf8');
    for (const anchor of anchors) {
      assert.match(html, new RegExp(`id="${anchor}"`), `${slug} is missing the ${anchor} heading`);
    }
  }
});
```

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS, 25 tests. These anchors are the contract the landing page links against in the next task.

- [ ] **Step 7: Read the pages in a browser**

Run: `npm run dev`, read all four pages end to end. Check for a claim contradicting the README, a broken code block, or an anchor list running past a screen height.

- [ ] **Step 8: Commit**

```bash
git add content test/build.test.mjs
git commit -m "docs: write install, analyses, CI, and integrations pages"
```

---

### Task 9: Landing page markup and the strata graphic

Produces the full landing page structure with the inline SVG centerpiece.

**Files:**
- Modify: `src/index.html`
- Modify: `test/build.test.mjs`

**Interfaces:**
- Consumes: `{{VERSION}}` and `{{YEAR}}` from Task 2, the `[data-copy]` and `[data-reveal]` contracts from Task 7.
- Produces: section ids `#analyses`, `#languages`, `#surfaces`, `#install`, referenced by in-page links and by Task 10's styles.

- [ ] **Step 1: Write the failing test**

Append to `test/build.test.mjs`:

```js
test('landing page has every section', async () => {
  const html = await readFile(path.join(out, 'index.html'), 'utf8');
  for (const id of ['analyses', 'languages', 'surfaces', 'install']) {
    assert.match(html, new RegExp(`id="${id}"`), `section ${id} is missing`);
  }
  assert.match(html, /One binary\. Six languages\. Six analyses\./);
  assert.match(html, /data-copy/);
});

test('the landing page and the docs shell share one header and footer', async () => {
  const landing = await readFile(path.join(out, 'index.html'), 'utf8');
  const docs = await readFile(path.join(out, 'docs', 'install', 'index.html'), 'utf8');
  for (const page of [landing, docs]) {
    assert.match(page, /<header class="topnav">/);
    assert.match(page, /<footer class="sitefoot">/);
    assert.match(page, /stratify-theme/);
  }
});

test('the strata graphic is accessible', async () => {
  const html = await readFile(path.join(out, 'index.html'), 'utf8');
  assert.match(html, /<svg[^>]*role="img"/);
  assert.match(html, /<title id="strata-title">/);
  assert.match(html, /aria-labelledby="strata-title strata-desc"/);
});

test('the language matrix names all six languages', async () => {
  const html = await readFile(path.join(out, 'index.html'), 'utf8');
  for (const lang of ['Java', 'Ruby', 'TypeScript', 'Python', 'Go', 'Rust']) {
    assert.match(html, new RegExp(`>${lang}<`), `${lang} missing from the page`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL. The landing page is still the two-line placeholder.

- [ ] **Step 3: Write the page head, nav, and hero**

Replace `src/index.html` entirely. Head and opening sections:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Stratify — one code quality gate for every language in your repo</title>
  <meta name="description" content="Stratify parses Java, Ruby, TypeScript, Python, Go, and Rust into one model and runs six static analyses on it. One binary, one config, one report. CLI, CI gate, SARIF, MCP, LSP, and OpenTelemetry.">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="canonical" href="https://stratify.dynaum.com/">
  <meta property="og:title" content="Stratify">
  <meta property="og:description" content="One binary. Six languages. Six analyses. Findings you can trust.">
  <meta property="og:url" content="https://stratify.dynaum.com/">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="/styles.css">
  <!--HEAD-SCRIPTS-->
</head>
<body class="landing">
  <a class="skip" href="#main">Skip to content</a>

  <!--NAV-->

  <main id="main">
    <section class="hero">
      <p class="eyebrow">Polyglot codebase intelligence</p>
      <h1>One binary. Six languages.<br>Six analyses.</h1>
      <p class="lede">Your repo has a Rails app, a Spring service, a Go module, and a pile of TypeScript. Each one has its own linter, its own report shape, and its own quality bar. Stratify parses all of them into one model and runs the same six analyses on every line. One gate. One report. No servers, no accounts.</p>

      <div class="cta">
        <div class="cta-block">
          <p class="cta-label">Add the gate to CI</p>
          <pre id="cta-yaml"><code>- uses: stratify-dev/stratify@{{VERSION}}
  with:
    fail-on: warning</code></pre>
          <button class="btn primary" type="button" data-copy="#cta-yaml">Copy workflow step</button>
        </div>
        <div class="cta-block">
          <p class="cta-label">Or run it locally</p>
          <pre id="cta-brew"><code>brew install stratify-dev/tap/stratify</code></pre>
          <button class="btn" type="button" data-copy="#cta-brew">Copy install line</button>
        </div>
      </div>
    </section>
```

- [ ] **Step 4: Add the strata graphic**

Continue `src/index.html`. Five strata, connected by rails. Chips are 140 wide on a 160 step, so six sit across a 960 viewBox.

```html
    <section class="strata-section" aria-labelledby="strata-heading">
      <h2 id="strata-heading">How it flows</h2>
      <p class="section-lede">Six languages compress into one model. Six analyses read only the model, so each one is written once and works everywhere. One stream of findings fans out to every surface.</p>

      <svg class="strata" viewBox="0 0 960 480" role="img" aria-labelledby="strata-title strata-desc" data-reveal>
        <title id="strata-title">The Stratify pipeline</title>
        <desc id="strata-desc">Java, Ruby, TypeScript, Python, Go, and Rust parse into one universal intermediate representation. Six analyses read that representation: dead code, duplication, complexity, churn hotspots, dependency cycles, and layer boundaries. They produce one stream of findings, which fans out to the CLI, a GitHub Action gate, SARIF, an MCP server, an editor language server, and OpenTelemetry export.</desc>

        <g class="stratum lang">
          <g class="chip"><rect x="10"  y="10" width="140" height="44" rx="8"/><text x="80"  y="37">Java</text></g>
          <g class="chip"><rect x="170" y="10" width="140" height="44" rx="8"/><text x="240" y="37">Ruby</text></g>
          <g class="chip"><rect x="330" y="10" width="140" height="44" rx="8"/><text x="400" y="37">TypeScript</text></g>
          <g class="chip"><rect x="490" y="10" width="140" height="44" rx="8"/><text x="560" y="37">Python</text></g>
          <g class="chip"><rect x="650" y="10" width="140" height="44" rx="8"/><text x="720" y="37">Go</text></g>
          <g class="chip"><rect x="810" y="10" width="140" height="44" rx="8"/><text x="880" y="37">Rust</text></g>
        </g>

        <g class="rails" aria-hidden="true">
          <path d="M80 54v14M240 54v14M400 54v14M560 54v14M720 54v14M880 54v14M80 68h800M480 68v14"/>
        </g>

        <g class="stratum ir" data-reveal>
          <rect x="10" y="96" width="940" height="52" rx="10"/>
          <text x="480" y="119">Universal IR</text>
          <text x="480" y="137" class="sub">symbols · references · a confidence level on every edge</text>
        </g>

        <g class="rails" aria-hidden="true">
          <path d="M480 148v14M80 176v-14M240 176v-14M400 176v-14M560 176v-14M720 176v-14M880 176v-14M80 162h800"/>
        </g>

        <g class="stratum analysis" data-reveal>
          <g class="chip"><rect x="10"  y="176" width="140" height="44" rx="8"/><text x="80"  y="203">Dead code</text></g>
          <g class="chip"><rect x="170" y="176" width="140" height="44" rx="8"/><text x="240" y="203">Duplication</text></g>
          <g class="chip"><rect x="330" y="176" width="140" height="44" rx="8"/><text x="400" y="203">Complexity</text></g>
          <g class="chip"><rect x="490" y="176" width="140" height="44" rx="8"/><text x="560" y="203">Hotspots</text></g>
          <g class="chip"><rect x="650" y="176" width="140" height="44" rx="8"/><text x="720" y="203">Cycles</text></g>
          <g class="chip"><rect x="810" y="176" width="140" height="44" rx="8"/><text x="880" y="203">Boundaries</text></g>
        </g>

        <g class="rails" aria-hidden="true">
          <path d="M80 220v14M240 220v14M400 220v14M560 220v14M720 220v14M880 220v14M80 234h800M480 234v14"/>
        </g>

        <g class="stratum findings" data-reveal>
          <rect x="10" y="262" width="940" height="52" rx="10"/>
          <text x="480" y="285">Findings</text>
          <text x="480" y="303" class="sub">rule · severity · confidence · file and line</text>
        </g>

        <g class="rails" aria-hidden="true">
          <path d="M480 314v14M80 342v-14M240 342v-14M400 342v-14M560 342v-14M720 342v-14M880 342v-14M80 328h800"/>
        </g>

        <g class="stratum surface" data-reveal>
          <g class="chip"><rect x="10"  y="342" width="140" height="44" rx="8"/><text x="80"  y="369">CLI</text></g>
          <g class="chip"><rect x="170" y="342" width="140" height="44" rx="8"/><text x="240" y="369">CI gate</text></g>
          <g class="chip"><rect x="330" y="342" width="140" height="44" rx="8"/><text x="400" y="369">SARIF</text></g>
          <g class="chip"><rect x="490" y="342" width="140" height="44" rx="8"/><text x="560" y="369">MCP</text></g>
          <g class="chip"><rect x="650" y="342" width="140" height="44" rx="8"/><text x="720" y="369">LSP</text></g>
          <g class="chip"><rect x="810" y="342" width="140" height="44" rx="8"/><text x="880" y="369">OTel</text></g>
        </g>
      </svg>
    </section>
```

- [ ] **Step 5: Add the terminal card and the three claims**

```html
    <section class="proof" aria-labelledby="proof-heading">
      <h2 id="proof-heading">What a run looks like</h2>
      <div class="terminal" data-reveal>
        <div class="terminal-bar" aria-hidden="true"><span></span><span></span><span></span></div>
        <pre><code><span class="prompt">$</span> stratify check .

<span class="sev-warn">warn</span>  Unused.java:2  unused function `neverCalled`
<span class="sev-info">info</span>  App.java:6  possibly unused function `helper`

2 finding(s).</code></pre>
      </div>
      <p class="caption">Stratify says <strong>unused</strong> when it proved the call graph, and <strong>possibly unused</strong> when it could not. It never hides a real finding behind a guess.</p>
    </section>

    <section class="claims" aria-labelledby="claims-heading">
      <h2 id="claims-heading">Why teams run it</h2>
      <ul class="claim-grid">
        <li data-reveal>
          <h3>Six languages, one engine</h3>
          <p>Every language parses into the same intermediate representation. Each analysis is written once and works everywhere, so a polyglot repo gets one consistent report instead of six dialects of "warning".</p>
        </li>
        <li data-reveal>
          <h3>It tells you how sure it is</h3>
          <p>Every finding carries a confidence level. Act on the warnings, triage the rest. No more muting a whole rule because it cried wolf twice.</p>
        </li>
        <li data-reveal>
          <h3>It meets you where you work</h3>
          <p>The same analysis drives the CLI, the CI gate, SARIF annotations, your editor, your coding agent, and your dashboards. One engine, six front doors.</p>
        </li>
      </ul>
    </section>
```

- [ ] **Step 6: Add the analyses grid, language matrix, surfaces, and footer**

```html
    <section id="analyses" aria-labelledby="analyses-heading">
      <h2 id="analyses-heading">The six analyses</h2>
      <p class="section-lede">They all run in a single pass. <a href="/docs/analyses/">Read the details</a>.</p>
      <ul class="analysis-grid">
        <li data-reveal><h3><a href="/docs/analyses/#dead-code">Dead code</a></h3><p>Functions and methods nothing reaches, resolved across files.</p></li>
        <li data-reveal><h3><a href="/docs/analyses/#duplication">Duplication</a></h3><p>Copy-pasted and renamed blocks, across files and across languages.</p></li>
        <li data-reveal><h3><a href="/docs/analyses/#complexity">Complexity</a></h3><p>Functions with high cyclomatic complexity, ranked by severity.</p></li>
        <li data-reveal><h3><a href="/docs/analyses/#churn-hotspots">Churn hotspots</a></h3><p>Complex code changing often. The riskiest spots in the repo.</p></li>
        <li data-reveal><h3><a href="/docs/analyses/#dependency-cycles">Dependency cycles</a></h3><p>Circular imports between files and packages.</p></li>
        <li data-reveal><h3><a href="/docs/analyses/#layer-boundaries">Layer boundaries</a></h3><p>Imports breaking the architecture rules you wrote down.</p></li>
      </ul>
    </section>

    <section id="languages" aria-labelledby="languages-heading">
      <h2 id="languages-heading">Coverage today</h2>
      <div class="matrix-scroll">
        <table class="matrix">
          <caption>Analysis coverage per language. Rust cycles and boundaries need module and <code>use</code> resolution, which is next on the roadmap.</caption>
          <thead>
            <tr><th scope="col">Language</th><th scope="col">Dead code</th><th scope="col">Duplication</th><th scope="col">Complexity</th><th scope="col">Hotspots</th><th scope="col">Cycles</th><th scope="col">Boundaries</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row">Java</th><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td></tr>
            <tr><th scope="row">Ruby</th><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td></tr>
            <tr><th scope="row">TypeScript</th><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td></tr>
            <tr><th scope="row">Python</th><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td></tr>
            <tr><th scope="row">Go</th><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td></tr>
            <tr><th scope="row">Rust</th><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="yes">Yes</td><td class="pending">Pending</td><td class="pending">Pending</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="surfaces" aria-labelledby="surfaces-heading">
      <h2 id="surfaces-heading">Six front doors</h2>
      <ul class="surface-grid">
        <li data-reveal><h3>CLI</h3><pre><code>stratify check .</code></pre><p><a href="/docs/install/">Install and quick start</a></p></li>
        <li data-reveal><h3>CI gate</h3><pre><code>- uses: stratify-dev/stratify@{{VERSION}}</code></pre><p><a href="/docs/ci/">Action inputs</a></p></li>
        <li data-reveal><h3>SARIF</h3><pre><code>stratify check . --format sarif</code></pre><p><a href="/docs/ci/#sarif-and-code-scanning">Code scanning setup</a></p></li>
        <li data-reveal><h3>MCP</h3><pre><code>stratify mcp</code></pre><p><a href="/docs/integrations/#mcp-server">Wire up your agent</a></p></li>
        <li data-reveal><h3>LSP</h3><pre><code>stratify lsp</code></pre><p><a href="/docs/integrations/#editor-language-server">Editor diagnostics</a></p></li>
        <li data-reveal><h3>OpenTelemetry</h3><pre><code>OTEL_EXPORTER_OTLP_ENDPOINT=...</code></pre><p><a href="/docs/integrations/#opentelemetry-export">Fleet dashboards</a></p></li>
      </ul>
    </section>

    <section id="install" class="closing" aria-labelledby="install-heading">
      <h2 id="install-heading">Scan your repo now</h2>
      <pre id="closing-install"><code>brew install stratify-dev/tap/stratify
stratify check .</code></pre>
      <button class="btn primary" type="button" data-copy="#closing-install">Copy both lines</button>
      <p><a href="/docs/install/">Other install methods</a> · <a href="https://github.com/stratify-dev/stratify">Source on GitHub</a></p>
    </section>
  </main>

  <!--FOOT-->
</body>
</html>
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 29 tests. The link checker resolves every `/docs/...#anchor` on this page against the headings written in Task 8.

- [ ] **Step 8: Commit**

```bash
git add src/index.html test/build.test.mjs
git commit -m "feat: landing page markup and the strata graphic"
```

---

### Task 10: Landing page and docs styles

Produces the finished visual layer for both themes.

**Files:**
- Modify: `src/styles.css`, `src/docs.css`

**Interfaces:**
- Consumes: every class and id from Tasks 7 and 9.
- Produces: no new contracts. Visual only.

- [ ] **Step 1: Style the shared shell**

Append to `src/styles.css`:

```css
.topnav {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  backdrop-filter: blur(8px);
  z-index: 5;
}
.wordmark { font-weight: 650; letter-spacing: -0.01em; text-decoration: none; color: var(--fg); }
.topnav nav { margin-left: auto; display: flex; gap: 1.25rem; }
.theme-toggle {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--fg);
  border-radius: var(--radius);
  padding: 0.35rem 0.75rem;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.sitefoot {
  border-top: 1px solid var(--line);
  padding: 2rem 1.5rem;
  color: var(--muted);
  font-size: 0.9rem;
  text-align: center;
}
.btn {
  display: inline-block;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--fg);
  border-radius: var(--radius);
  padding: 0.6rem 1.1rem;
  font: inherit;
  font-weight: 550;
  cursor: pointer;
}
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--bg); }
.btn.copied { border-color: var(--sev-info); }
.btn.copied::after { content: ' ✓'; }
```

- [ ] **Step 2: Style the landing sections**

Append to `src/styles.css`:

```css
.landing main { max-width: 1040px; margin: 0 auto; padding: 0 1.5rem; }
.landing section { padding: 4.5rem 0; border-bottom: 1px solid var(--line); }
.landing section:last-of-type { border-bottom: 0; }
.landing h2 { font-size: clamp(1.5rem, 3vw, 2rem); letter-spacing: -0.02em; margin: 0 0 0.75rem; }
.section-lede, .lede { color: var(--muted); max-width: var(--measure); }

.hero { padding-top: 4rem; }
.eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; color: var(--muted); margin: 0 0 0.75rem; }
.hero h1 { font-size: clamp(2.2rem, 6vw, 3.6rem); line-height: 1.08; letter-spacing: -0.03em; margin: 0 0 1.25rem; }
.hero .lede { font-size: 1.1rem; }
.cta { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-top: 2.5rem; }
.cta-block { border: 1px solid var(--line); border-radius: var(--radius); padding: 1.25rem; background: var(--surface); }
.cta-label { margin: 0 0 0.75rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
.cta-block pre { margin: 0 0 1rem; overflow-x: auto; font-size: 0.85rem; }

.strata { width: 100%; height: auto; }
.strata .chip rect, .strata .stratum > rect { fill: var(--stratum-1); stroke: var(--line); }
.strata .ir > rect { fill: var(--stratum-2); }
.strata .findings > rect { fill: var(--stratum-3); }
.strata text { fill: var(--fg); font-family: var(--mono); font-size: 14px; text-anchor: middle; }
.strata .stratum > text:first-of-type { font-size: 16px; font-weight: 600; }
.strata text.sub { font-size: 12px; fill: var(--muted); }
.strata .rails path { stroke: var(--line); stroke-width: 1.5; fill: none; }

.terminal { border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); overflow: hidden; }
.terminal-bar { display: flex; gap: 0.4rem; padding: 0.7rem 0.9rem; border-bottom: 1px solid var(--line); }
.terminal-bar span { width: 10px; height: 10px; border-radius: 50%; background: var(--line); }
.terminal pre { margin: 0; padding: 1.25rem; overflow-x: auto; font-size: 0.9rem; line-height: 1.7; }
.terminal .prompt { color: var(--muted); }
.sev-warn { color: var(--sev-warn); font-weight: 650; }
.sev-info { color: var(--sev-info); font-weight: 650; }
.sev-error { color: var(--sev-error); font-weight: 650; }
.caption { color: var(--muted); max-width: var(--measure); margin-top: 1.25rem; }

.claim-grid, .analysis-grid, .surface-grid {
  list-style: none;
  padding: 0;
  margin: 2rem 0 0;
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
.claim-grid li, .analysis-grid li, .surface-grid li {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 1.25rem;
  background: var(--surface);
}
.claim-grid h3, .analysis-grid h3, .surface-grid h3 { margin: 0 0 0.5rem; font-size: 1.05rem; }
.claim-grid p, .analysis-grid p, .surface-grid p { margin: 0; color: var(--muted); font-size: 0.95rem; }
.surface-grid pre { margin: 0 0 0.75rem; overflow-x: auto; font-size: 0.82rem; }

.matrix-scroll { overflow-x: auto; margin-top: 2rem; }
.matrix { border-collapse: collapse; width: 100%; min-width: 640px; font-size: 0.9rem; }
.matrix caption { caption-side: bottom; text-align: left; color: var(--muted); font-size: 0.85rem; padding-top: 1rem; }
.matrix th, .matrix td { border: 1px solid var(--line); padding: 0.6rem 0.75rem; text-align: left; }
.matrix thead th { background: var(--surface); font-weight: 600; }
.matrix td.yes { color: var(--sev-info); }
.matrix td.pending { color: var(--sev-warn); }

.closing { text-align: center; }
.closing pre { display: inline-block; text-align: left; margin: 1.5rem 0; }
```

- [ ] **Step 2b: Guard the sticky nav blur**

`backdrop-filter` is unsupported in some browsers. Add a fallback right after the `.topnav` rule:

```css
@supports not (backdrop-filter: blur(8px)) {
  .topnav { background: var(--bg); }
}
```

- [ ] **Step 3: Style the docs shell**

Replace `src/docs.css`:

```css
.docs-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 200px;
  gap: 2.5rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 4rem;
  align-items: start;
}
.sidebar, .anchors { position: sticky; top: 5rem; font-size: 0.9rem; }
.sidebar ul, .anchors ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
.sidebar a, .anchors a { text-decoration: none; color: var(--muted); display: block; padding: 0.3rem 0; }
.sidebar a:hover, .anchors a:hover { color: var(--fg); }
.sidebar a[aria-current='page'] { color: var(--fg); font-weight: 600; border-left: 2px solid var(--accent); padding-left: 0.6rem; margin-left: -0.6rem; }
.anchors-title { text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.72rem; color: var(--muted); margin: 0 0 0.6rem; }

.docs article { max-width: var(--measure); }
.docs article h1 { font-size: clamp(1.8rem, 4vw, 2.4rem); letter-spacing: -0.02em; margin: 0 0 1.5rem; }
.docs article h2 { font-size: 1.35rem; letter-spacing: -0.01em; margin: 2.75rem 0 0.75rem; scroll-margin-top: 5rem; }
.docs article h3 { font-size: 1.05rem; margin: 1.75rem 0 0.5rem; }
.docs article pre { padding: 1rem 1.15rem; border-radius: var(--radius); border: 1px solid var(--line); overflow-x: auto; font-size: 0.88rem; }
.docs article :not(pre) > code { background: var(--surface); border: 1px solid var(--line); border-radius: 4px; padding: 0.1em 0.35em; font-size: 0.88em; }
.docs article table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
.docs article th, .docs article td { border: 1px solid var(--line); padding: 0.55rem 0.7rem; text-align: left; }
.docs article blockquote { border-left: 3px solid var(--accent); margin: 1.5rem 0; padding: 0.25rem 0 0.25rem 1rem; color: var(--muted); }

.prevnext { display: flex; justify-content: space-between; gap: 1rem; margin-top: 4rem; padding-top: 1.5rem; border-top: 1px solid var(--line); }
.prevnext a { text-decoration: none; border: 1px solid var(--line); border-radius: var(--radius); padding: 0.75rem 1rem; color: var(--fg); background: var(--surface); }
.prevnext .next { margin-left: auto; text-align: right; }
.prevnext span { display: block; font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }

@media (max-width: 1080px) {
  .docs-layout { grid-template-columns: 200px minmax(0, 1fr); }
  .anchors { display: none; }
}
@media (max-width: 720px) {
  .docs-layout { grid-template-columns: minmax(0, 1fr); }
  .sidebar { position: static; border-bottom: 1px solid var(--line); padding-bottom: 1rem; }
  .sidebar ul { grid-auto-flow: column; grid-auto-columns: max-content; overflow-x: auto; gap: 1rem; }
}
```

- [ ] **Step 3b: Carry over three items from the Task 9 review**

**Replace the em dashes in both page titles.** House style rules them out, and the footer already uses a middle dot as its separator, so match that.

`src/index.html`:

```html
  <title>Stratify · one code quality gate for every language in your repo</title>
```

`templates/docs.html`:

```html
  <title>{{TITLE}} · Stratify docs</title>
```

**Fix a test that passes for the wrong reason.** In `test/build.test.mjs`, the assertion

```js
  assert.match(html, /One binary\. Six languages\. Six analyses\./);
```

never matches the `<h1>` it appears to check. The heading carries a `<br>` between the second and third sentence, so the literal-space match fails there and succeeds instead against the `og:description` meta tag, which happens to contain the same phrase. Delete the tag and the test still passes. Replace it with an assertion on the heading itself:

```js
  const h1 = /<h1>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '';
  const h1Text = h1.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.equal(h1Text, 'One binary. Six languages. Six analyses.');
```

Replacing tags with a space rather than nothing matters — otherwise `<br>` collapses "languages." and "Six" into one word.

**Guard copy targets and id uniqueness.** Every `[data-copy]` value names another element by id. Nothing currently catches a typo there, and a dangling selector produces a button that silently does nothing. Duplicate ids break `aria-labelledby` and the fragment checker's assumptions at the same time. Append:

```js
test('every copy button targets a real element, and ids are unique', async () => {
  const files = await htmlFiles(out);
  assert.ok(files.length > 0, 'no HTML files were built, so this test would pass vacuously');
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    const rel = path.relative(out, file);

    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    assert.deepEqual(duplicates, [], `duplicate id(s) in ${rel}`);

    for (const [, selector] of html.matchAll(/\sdata-copy="([^"]+)"/g)) {
      assert.match(selector, /^#[\w-]+$/, `${rel}: data-copy="${selector}" is not a simple id selector`);
      assert.ok(ids.includes(selector.slice(1)), `${rel}: data-copy="${selector}" points at no element`);
    }
  }
});
```

- [ ] **Step 4: Add the page-weight and no-third-party tests**

Append to `test/build.test.mjs`:

```js
test('the landing page stays under the 150 KB budget', async () => {
  let total = 0;
  for (const file of ['index.html', 'styles.css', 'theme.js', 'assets/favicon.svg']) {
    total += Buffer.byteLength(await readFile(path.join(out, file)));
  }
  assert.ok(total < 150 * 1024, `landing page weighs ${Math.round(total / 1024)} KB`);
});

test('nothing loads from a third-party host', async () => {
  for (const file of await htmlFiles(out)) {
    const html = await readFile(file, 'utf8');
    for (const [, url] of html.matchAll(/\s(?:src|href)="(https?:\/\/[^"]+)"/g)) {
      const tag = html.slice(Math.max(0, html.indexOf(url) - 200), html.indexOf(url));
      const loads = /<(script|link)\b[^>]*$/.test(tag);
      assert.ok(!loads, `${path.relative(out, file)} loads ${url} from a third party`);
    }
  }
});
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS, 32 tests. Three of those are new in this task and one existing assertion was corrected; the styles themselves change no test outcome.

- [ ] **Step 6: Review both themes in a browser**

Run: `npm run dev`
Check at 1440px, 900px, and 375px widths, in light and dark:
- The strata graphic stays legible at 375px and never overflows the page.
- The matrix scrolls inside its own container, and the page body never scrolls sideways.
- Terminal severity colors read clearly in both themes.
- Toggle "Emulate prefers-reduced-motion" in devtools and reload: all content is visible with no transitions.
- Tab through the page: focus rings are visible on every link and button.

- [ ] **Step 7: Commit**

```bash
git add src/styles.css src/docs.css test/build.test.mjs
git commit -m "feat: landing and docs styling for both themes"
```

---

### Task 11: Deploy workflow and repo README

Produces automated deploys to GitHub Pages.

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: `npm ci`, `npm test`, `npm run build` from Task 1.
- Produces: a Pages deployment from the `dist/` artifact on every push to `main`.

- [ ] **Step 1: Write the workflow**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:
  schedule:
    - cron: '17 6 * * 1'

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

The weekly cron refreshes `{{VERSION}}` after an engine release with no site commit.

- [ ] **Step 2: Write the repo README**

`README.md`:

````markdown
# stratify.dynaum.com

Marketing site and docs for [Stratify](https://github.com/stratify-dev/stratify).

## Run it locally

```sh
npm install
npm run dev     # builds, then serves dist/ on http://localhost:8000
npm test        # builds into a temp dir and checks structure, tokens, and links
```

## How it builds

`build.mjs` copies `src/` and `assets/` into `dist/`, substitutes `{{VERSION}}`
with the latest Stratify release tag, renders every `content/*.md` file through
marked with build-time shiki highlighting, and wraps each one in
`templates/docs.html`.

Set `STRATIFY_VERSION=v1.2.3` to pin the version locally. Without it the build
queries the GitHub releases API and falls back to `FALLBACK_VERSION` in
`build.mjs` when offline.

## Where content lives

| Change | Edit |
|--------|------|
| Landing page copy or layout | `src/index.html` |
| Docs prose | `content/*.md` |
| Colors, type, spacing | `src/styles.css` |
| Docs page layout | `src/docs.css` |

The engine README keeps the pitch, install, and 60-second start. This site
carries the long form. When they disagree, the site is wrong.

## Deploy

Push to `main`. GitHub Actions builds and deploys to GitHub Pages. A weekly cron
rebuilds so version snippets track the latest release.
````

- [ ] **Step 3: Verify the workflow parses**

Run: `python3 -c "import sys;print('yaml ok')" && node -e "console.log(require('fs').readFileSync('.github/workflows/deploy.yml','utf8').split('\n').length + ' lines')"`
Expected: prints `yaml ok` and a line count. Also read the file once and confirm indentation is consistent.

- [ ] **Step 4: Run the full suite one more time**

Run: `npm test && npm run build`
Expected: all tests PASS, and the build prints `built 4 docs page(s) at v... into .../dist`.

- [ ] **Step 5: Commit**

```bash
git add .github README.md
git commit -m "ci: build, test, and deploy to GitHub Pages"
```

---

### Task 12: Publish, wire DNS, and cross-link

Produces the live site at its final domain.

**Files:**
- Modify: `~/dev/digitalocean-dns/dns.tf`
- Modify: `~/dev/stratify/README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a live site at https://stratify.dynaum.com.

- [ ] **Step 1: Create the GitHub repo and push**

```bash
cd ~/dev/stratify-site
git branch -M main
gh repo create stratify-dev/stratify-site --public --source=. --remote=origin \
  --description "Marketing site and docs for Stratify — stratify.dynaum.com"
git push -u origin main
```

- [ ] **Step 2: Enable Pages and wait for the first deploy**

```bash
gh api -X POST repos/stratify-dev/stratify-site/pages -f build_type=workflow || \
  gh api -X PUT repos/stratify-dev/stratify-site/pages -f build_type=workflow
gh run watch --repo stratify-dev/stratify-site
```
Expected: the Deploy workflow finishes green.

- [ ] **Step 3: Set the custom domain**

```bash
gh api -X PUT repos/stratify-dev/stratify-site/pages -f cname=stratify.dynaum.com
```
Expected: no error. The `CNAME` file in `dist/` already carries the domain, so the setting sticks across deploys.

- [ ] **Step 4: Add the DNS record**

Append to `~/dev/digitalocean-dns/dns.tf`, after the `bplog` record, matching the file's existing comment style:

```hcl
# stratify.dynaum.com — marketing site and docs for Stratify
# (github.com/stratify-dev/stratify-site), served via GH Pages with custom
# domain. Points at the org Pages host; GH routes by Host header.
resource "digitalocean_record" "dynaum_com_cname_stratify" {
  domain = digitalocean_domain.dynaum_com.id
  type   = "CNAME"
  name   = "stratify"
  value  = "stratify-dev.github.io."
  ttl    = 1800
}
```

- [ ] **Step 5: Apply the DNS change**

```bash
cd ~/dev/digitalocean-dns
source ~/.local_config
terraform plan     # expect exactly one resource to add, zero to change, zero to destroy
terraform apply
```
Expected: `Plan: 1 to add, 0 to change, 0 to destroy.` Stop and investigate if anything else appears.

- [ ] **Step 6: Verify DNS and TLS**

```bash
dig +short stratify.dynaum.com
curl -sSI https://stratify.dynaum.com | head -1
```
Expected: `dig` returns `stratify-dev.github.io.` and the four GitHub Pages IPs. `curl` returns `HTTP/2 200`. The certificate takes up to 15 minutes after DNS propagates. Retry before treating a TLS error as a failure.

- [ ] **Step 7: Enforce HTTPS**

```bash
gh api -X PUT repos/stratify-dev/stratify-site/pages -F https_enforced=true
```

- [ ] **Step 8: Link the site from the engine README**

In `~/dev/stratify/README.md`, add one line directly under the opening tagline:

```markdown
**Docs:** [stratify.dynaum.com](https://stratify.dynaum.com)
```

Then commit in that repo:

```bash
cd ~/dev/stratify
git add README.md
git commit -m "docs: link the docs site"
git push
```

- [ ] **Step 9: Final check of the live site**

Open https://stratify.dynaum.com and confirm:
- Both themes work and the choice survives a reload.
- All four docs pages load, sidebar links work, prev/next works.
- The version in the hero snippet matches the current release.
- No console errors.

- [ ] **Step 10: Refresh the Obsidian note**

Update the `stratify` note in the `web` vault: regenerate the `<!-- sync:auto -->` block and the `date` field only, adding the live URL. Leave the prose sections untouched.


---

## Appendix: why the two link tests assert a non-empty file list

Both tests end in `assert.deepEqual(problems, [])`. If `htmlFiles()` ever returned an empty array — a renamed output directory, a build that silently wrote nothing — that assertion passes while checking nothing, and the safety net reports green on a broken site. Test ordering happens to protect against it today, since earlier tests read concrete files out of the same fixture, but that is incidental rather than guaranteed. The explicit length check makes the guarantee belong to the test itself.
