import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked, marked } from 'marked';
import { createHighlighter } from 'shiki';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const FALLBACK_VERSION = 'v0.4.0';

const PARTIALS = ['head-scripts', 'nav', 'foot'];

const LANGS = ['sh', 'bash', 'yaml', 'toml', 'json', 'js', 'ts', 'rust', 'ruby', 'python', 'go', 'java', 'text'];

let highlighterPromise;
function getHighlighter() {
  highlighterPromise ??= createHighlighter({ themes: ['github-light', 'github-dark'], langs: LANGS });
  return highlighterPromise;
}

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

export async function build({ outDir = path.join(ROOT, 'dist'), version = FALLBACK_VERSION } = {}) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  await cp(path.join(ROOT, 'src'), outDir, { recursive: true });
  await cp(path.join(ROOT, 'assets'), path.join(outDir, 'assets'), { recursive: true });
  await cp(path.join(ROOT, 'CNAME'), path.join(outDir, 'CNAME'));

  const tokens = { VERSION: version, YEAR: '2026' };

  const partials = await loadPartials();
  const template = injectPartials(await readFile(path.join(ROOT, 'templates', 'docs.html'), 'utf8'), partials);
  const files = (await readdir(path.join(ROOT, 'content'))).filter((f) => f.endsWith('.md')).sort();
  const highlighter = await getHighlighter();

  const parsed = [];
  for (const file of files) {
    const raw = await readFile(path.join(ROOT, 'content', file), 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const headings = [];
    const md = new Marked({ renderer: makeRenderer(headings, highlighter) });
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

  for (const [index, page] of parsed.entries()) {
    const shell = applyTokens(template, {
      ...tokens,
      TITLE: escapeHtml(page.title),
      DESCRIPTION: escapeHtml(page.description),
    });
    const out = shell
      .replace('<!--SIDEBAR-->', renderSidebar(parsed, page.slug))
      .replace('<!--CONTENT-->', page.html)
      .replace('<!--ANCHORS-->', renderAnchors(page.headings))
      .replace('<!--PREVNEXT-->', renderPrevNext(parsed, index));
    await mkdir(path.join(outDir, 'docs', page.slug), { recursive: true });
    await writeFile(path.join(outDir, 'docs', page.slug, 'index.html'), out);
  }

  const indexPath = path.join(outDir, 'index.html');
  const indexHtml = injectPartials(await readFile(indexPath, 'utf8'), partials);
  await writeFile(indexPath, applyTokens(indexHtml, tokens));

  return {
    outDir,
    version,
    pages: parsed.map(({ slug, title, order, description, headings }) => ({ slug, title, order, description, headings })),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const version = await resolveVersion();
  const result = await build({ version });
  process.stdout.write(`built ${result.pages.length} docs page(s) at ${version} into ${result.outDir}\n`);
}
