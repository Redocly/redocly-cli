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
  target: 'node24',
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

const allInputs = Object.values(result.metafile.outputs).flatMap((chunk) =>
  Object.keys(chunk.inputs)
);

const seenPkgRoots = new Set();
const licenseGroups = new Map(); // spdx -> { text, packages: ['name@version — Copyright ...'] }

for (const relInput of allInputs) {
  const absInput = path.resolve(packageDir, relInput);
  const pkgRootMatch = absInput.match(/^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)/);
  if (!pkgRootMatch) continue;
  const pkgRoot = pkgRootMatch[1];
  if (seenPkgRoots.has(pkgRoot)) continue;
  seenPkgRoots.add(pkgRoot);

  const pkgJsonPath = path.join(pkgRoot, 'package.json');
  if (!existsSync(pkgJsonPath)) continue;

  const name = pkgRoot.replace(/^.*\/node_modules\//, '');
  const { version, license } = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  const spdx = license ?? 'unknown';
  const licenseText = findLicenseText(pkgRoot);
  const copyrightLine = licenseText?.match(/Copyright.+/i)?.[0]?.trim();

  if (!licenseGroups.has(spdx)) {
    licenseGroups.set(spdx, { text: licenseText, packages: [] });
  }
  const entry = copyrightLine ? `${name}@${version} — ${copyrightLine}` : `${name}@${version}`;
  licenseGroups.get(spdx).packages.push(entry);
}

const sections = [...licenseGroups.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([spdx, { text, packages }]) => {
    const packageList = packages.sort().map((pkg) => `  ${pkg}`).join('\n');
    const licenseBody = text ?? '(no license text found)';
    return `${'='.repeat(60)}\n${spdx}\n\nPackages:\n${packageList}\n\nLicense text:\n${licenseBody}`;
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
