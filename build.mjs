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
