import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build, applyTokens, resolveVersion, validateFrontmatter, FALLBACK_VERSION } from '../build.mjs';

let out;

const textOf = (html) => html.replace(/<[^>]+>/g, '');

before(async () => {
  out = await mkdtemp(path.join(tmpdir(), 'stratify-site-'));
  await build({ outDir: out, version: 'v9.9.9' });
});

test('copies the landing page', async () => {
  const html = await readFile(path.join(out, 'index.html'), 'utf8');
  const h1 = /<h1>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '';
  const h1Text = h1.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.equal(h1Text, 'One binary. Six languages. Six analyses.');
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

test('in CI, a failed lookup throws instead of silently falling back', async () => {
  const savedCi = process.env.CI;
  process.env.CI = 'true';
  try {
    await assert.rejects(
      () => withStubbedLookup(() => Promise.reject(new Error('offline')), resolveVersion).then(({ value }) => value),
      /version lookup failed in CI/,
    );
  } finally {
    if (savedCi === undefined) delete process.env.CI;
    else process.env.CI = savedCi;
  }
});

test('outside CI, a failed lookup still falls back with a warning', async () => {
  const savedCi = process.env.CI;
  delete process.env.CI;
  try {
    const { value, stderr } = await withStubbedLookup(() => Promise.reject(new Error('offline')), resolveVersion);
    assert.equal(value, FALLBACK_VERSION);
    assert.match(stderr, /warn: version lookup failed/);
  } finally {
    if (savedCi === undefined) delete process.env.CI;
    else process.env.CI = savedCi;
  }
});

test('sends an authorization header only when GITHUB_TOKEN is set', async () => {
  const savedToken = process.env.GITHUB_TOKEN;
  const capture = (expectAuth) => (url, options) => {
    if (expectAuth) assert.equal(options.headers.authorization, 'Bearer secret-token');
    else assert.ok(!('authorization' in options.headers), 'authorization header sent without a GITHUB_TOKEN');
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ tag_name: 'v1.2.3' }) });
  };
  try {
    process.env.GITHUB_TOKEN = 'secret-token';
    await withStubbedLookup(capture(true), resolveVersion);
    delete process.env.GITHUB_TOKEN;
    await withStubbedLookup(capture(false), resolveVersion);
  } finally {
    if (savedToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = savedToken;
  }
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

const VALID_FRONTMATTER = { title: 'Install & quick start', order: 1, description: 'Install Stratify.' };

test('validateFrontmatter accepts a complete record', () => {
  assert.doesNotThrow(() => validateFrontmatter(VALID_FRONTMATTER, 'install.md'));
});

test('validateFrontmatter throws naming the file and field when title is missing', () => {
  const { title, ...rest } = VALID_FRONTMATTER;
  assert.throws(() => validateFrontmatter(rest, 'install.md'), /install\.md.*title/s);
});

test('validateFrontmatter throws naming the file and field when description is missing', () => {
  const { description, ...rest } = VALID_FRONTMATTER;
  assert.throws(() => validateFrontmatter(rest, 'install.md'), /install\.md.*description/s);
});

test('validateFrontmatter throws naming the file and field when order is missing', () => {
  const { order, ...rest } = VALID_FRONTMATTER;
  assert.throws(() => validateFrontmatter(rest, 'install.md'), /install\.md.*order/s);
});

test('validateFrontmatter rejects a non-numeric order (NaN would otherwise reach the sidebar)', () => {
  assert.throws(() => validateFrontmatter({ ...VALID_FRONTMATTER, order: 'first' }, 'install.md'), /install\.md.*order/s);
});

test('validateFrontmatter rejects an empty title or description', () => {
  assert.throws(() => validateFrontmatter({ ...VALID_FRONTMATTER, title: '  ' }, 'install.md'), /install\.md.*title/s);
  assert.throws(() => validateFrontmatter({ ...VALID_FRONTMATTER, description: '' }, 'install.md'), /install\.md.*description/s);
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

  // Build page path -> id set once, so a cross-page fragment link (e.g.
  // /docs/analyses/#dead-code) can be checked against the ids the *target*
  // page actually renders, not just the ids on the page holding the link.
  const idsByFile = new Map();
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    idsByFile.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }

  const resolveTarget = async (clean) => {
    const target = path.join(out, clean.replace(/^\//, ''));
    try {
      const info = await stat(target);
      if (!info.isDirectory()) return target;
      const withIndex = path.join(target, 'index.html');
      return (await exists(withIndex)) ? withIndex : null;
    } catch {
      return null;
    }
  };

  for (const file of files) {
    const html = await readFile(file, 'utf8');
    const ids = idsByFile.get(file);
    for (const [, href] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:|tel:|data:)/.test(href)) continue;
      if (href.startsWith('#')) {
        if (href !== '#' && !ids.has(href.slice(1))) problems.push(`${path.relative(out, file)} -> ${href}`);
        continue;
      }
      const [pathPart, fragment] = href.split('#');
      const clean = pathPart.split('?')[0];
      if (clean === '') continue;
      const targetFile = await resolveTarget(clean);
      if (!targetFile) {
        problems.push(`${path.relative(out, file)} -> ${href}`);
        continue;
      }
      if (fragment && !idsByFile.get(targetFile)?.has(fragment)) {
        problems.push(`${path.relative(out, file)} -> ${href} (no #${fragment} in ${path.relative(out, targetFile)})`);
      }
    }
  }
  assert.deepEqual(problems, [], `broken links:\n${problems.join('\n')}`);
});

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

test('landing page has every section', async () => {
  const html = await readFile(path.join(out, 'index.html'), 'utf8');
  for (const id of ['analyses', 'languages', 'surfaces', 'install']) {
    assert.match(html, new RegExp(`id="${id}"`), `section ${id} is missing`);
  }
  assert.match(html, /data-copy/);
});

test('the landing page and the docs shell share one header and footer', async () => {
  const landing = await readFile(path.join(out, 'index.html'), 'utf8');
  const docs = await readFile(path.join(out, 'docs', 'install', 'index.html'), 'utf8');
  for (const page of [landing, docs]) {
    assert.match(page, /<header class="topnav">/);
    assert.match(page, /<footer class="sitefoot">/);
    assert.match(page, /stratify-theme/);
    assert.match(page, /<script src="\/theme\.js" defer><\/script>/, 'the page must load theme.js, or [data-reveal] content never becomes visible');
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

test('the landing page stays under the 150 KB budget', async () => {
  let total = 0;
  for (const file of ['index.html', 'styles.css', 'theme.js', 'assets/favicon.svg']) {
    total += Buffer.byteLength(await readFile(path.join(out, file)));
  }
  assert.ok(total < 150 * 1024, `landing page weighs ${Math.round(total / 1024)} KB`);
});

test('nothing loads from a third-party host', async () => {
  const files = await htmlFiles(out);
  assert.ok(files.length > 0, 'no HTML files were built, so this test would pass vacuously');

  // Only rels that actually fetch a subresource count. rel="canonical" and
  // friends are metadata: they name a URL, they never load it.
  const FETCHING_RELS = new Set([
    'stylesheet', 'icon', 'apple-touch-icon', 'manifest',
    'preload', 'prefetch', 'preconnect', 'dns-prefetch',
  ]);

  for (const file of files) {
    const html = await readFile(file, 'utf8');
    const rel = path.relative(out, file);

    for (const [, src] of html.matchAll(/<script\b[^>]*\ssrc="(https?:\/\/[^"]+)"/g)) {
      assert.fail(`${rel} loads a script from ${src}`);
    }

    for (const [tag] of html.matchAll(/<link\b[^>]*>/g)) {
      const href = /\shref="(https?:\/\/[^"]+)"/.exec(tag)?.[1];
      if (!href) continue;
      const linkRel = (/\srel="([^"]+)"/.exec(tag)?.[1] ?? '').toLowerCase();
      const fetches = linkRel.split(/\s+/).some((r) => FETCHING_RELS.has(r));
      assert.ok(!fetches, `${rel} loads ${href} from a third party via rel="${linkRel}"`);
    }
  }
});

test('wide docs tables scroll in a wrapper, keeping their table semantics', async () => {
  const css = await readFile(path.join(out, 'docs.css'), 'utf8');
  for (const [, selector, body] of css.matchAll(/([^{}]*\btable\b[^{}]*)\{([^}]*)\}/g)) {
    assert.ok(
      !/display:\s*block/.test(body),
      `"${selector.trim()}" sets display:block on a table, which drops its implicit ARIA role`,
    );
  }

  const page = await readFile(path.join(out, 'docs', 'analyses', 'index.html'), 'utf8');
  const tables = (page.match(/<table[\s>]/g) ?? []).length;
  const wrapped = (page.match(/<div class="table-scroll"><table/g) ?? []).length;
  assert.ok(tables > 0, 'expected at least one table on the analyses page');
  assert.equal(wrapped, tables, 'every docs table must sit inside a .table-scroll wrapper');
});
