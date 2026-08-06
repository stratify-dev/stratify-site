import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const FALLBACK_VERSION = 'v0.4.0';

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

export async function build({ outDir = path.join(ROOT, 'dist'), version = FALLBACK_VERSION } = {}) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  await cp(path.join(ROOT, 'src'), outDir, { recursive: true });
  await cp(path.join(ROOT, 'assets'), path.join(outDir, 'assets'), { recursive: true });
  await cp(path.join(ROOT, 'CNAME'), path.join(outDir, 'CNAME'));

  const tokens = { VERSION: version, YEAR: '2026' };
  const indexPath = path.join(outDir, 'index.html');
  await writeFile(indexPath, applyTokens(await readFile(indexPath, 'utf8'), tokens));

  return { outDir, version, pages: [] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const version = await resolveVersion();
  const result = await build({ version });
  process.stdout.write(`built ${result.pages.length} docs page(s) at ${version} into ${result.outDir}\n`);
}
