import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Build the bundle and stage a dependency-free package in `.publish` for npm to publish.

// Runs the bundle (top-level await in build.mjs).
await import('./build.mjs');

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = path.resolve(packageDir, '..', '..');

const pkg = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf-8'));
const binEntrypoint = pkg.bin.redocly;
const publishDir = path.join(packageDir, pkg.publishConfig.directory);

rmSync(publishDir, { recursive: true, force: true });
mkdirSync(path.join(publishDir, path.dirname(binEntrypoint)), { recursive: true });
mkdirSync(path.join(publishDir, 'lib'), { recursive: true });

copyFileSync(path.join(packageDir, binEntrypoint), path.join(publishDir, binEntrypoint));
copyFileSync(path.join(packageDir, 'lib/index.js'), path.join(publishDir, 'lib/index.js'));
copyFileSync(path.join(rootDir, 'README.md'), path.join(publishDir, 'README.md'));
copyFileSync(path.join(rootDir, 'LICENSE.md'), path.join(publishDir, 'LICENSE'));

const publishPackageJson = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  license: pkg.license,
  type: pkg.type,
  bin: pkg.bin,
  repository: pkg.repository,
  homepage: pkg.homepage,
  keywords: pkg.keywords,
  contributors: pkg.contributors,
  engines: pkg.engines,
  engineStrict: pkg.engineStrict,
  files: [binEntrypoint, 'lib/index.js', 'README.md', 'LICENSE'],
};

writeFileSync(
  path.join(publishDir, 'package.json'),
  `${JSON.stringify(publishPackageJson, null, 2)}\n`
);
