import { build } from 'esbuild';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

rmSync(path.join(packageDir, 'lib'), { recursive: true, force: true });

const result = await build({
  absWorkingDir: packageDir,
  entryPoints: ['src/index.ts'],
  outdir: 'lib',
  chunkNames: 'chunks/[hash]',
  bundle: true,
  splitting: true,
  platform: 'node',
  format: 'esm',
  target: 'node20.19',
  metafile: true,
  // Avoid errors when external dependencies use CJS syntax.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
  logLevel: 'info',
});

// Guard: redoc must stay in the lazy build-docs chunk, not the entry point.
const entryChunkInputs = Object.keys(result.metafile.outputs['lib/index.js']?.inputs ?? {});
if (entryChunkInputs.some((inputPath) => inputPath.includes('node_modules/redoc'))) {
  throw new Error(
    'redoc leaked into lib/index.js — check for stray static imports in build-docs commands'
  );
}

// Collect unique bundled node_modules packages and generate THIRD_PARTY_NOTICES.
const allInputs = Object.values(result.metafile.outputs).flatMap((chunk) => Object.keys(chunk.inputs));

const pkgRoots = new Map();
for (const relInput of allInputs) {
  const absInput = path.resolve(packageDir, relInput);
  const pkgRootMatch = absInput.match(/^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)/);
  if (!pkgRootMatch) continue;
  const pkgRoot = pkgRootMatch[1];
  if (pkgRoots.has(pkgRoot)) continue;
  const pkgJsonPath = path.join(pkgRoot, 'package.json');
  if (!existsSync(pkgJsonPath)) continue;
  const name = pkgRoot.replace(/^.*\/node_modules\//, '');
  const { version, license } = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  pkgRoots.set(pkgRoot, { name, version, license, pkgRoot });
}

const entries = [...pkgRoots.values()].sort((a, b) => a.name.localeCompare(b.name));

const sections = entries.map(({ name, version, license, pkgRoot }) => {
  const licenseText =
    findLicenseText(pkgRoot) ?? `(no LICENSE file; declared: ${license ?? 'unknown'})`;
  return `${'='.repeat(60)}\n${name} ${version}\nSPDX-License-Identifier: ${license ?? 'unknown'}\n\n${licenseText}`;
});

writeFileSync(
  path.join(packageDir, 'THIRD_PARTY_NOTICES'),
  `Third-party software bundled in @redocly/cli\n\n${sections.join('\n\n')}\n`
);

function findLicenseText(pkgRoot) {
  for (const filename of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md']) {
    const licensePath = path.join(pkgRoot, filename);
    if (existsSync(licensePath)) return readFileSync(licensePath, 'utf-8').trimEnd();
  }
  return null;
}
