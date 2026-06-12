import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

await import('./build.mjs');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, '..');
const rootDir = path.resolve(packageDir, '..', '..');

const packageJsonPath = path.join(packageDir, 'package.json');
const readmeSourcePath = path.join(rootDir, 'README.md');
const licenseSourcePath = path.join(rootDir, 'LICENSE.md');

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const binEntrypoint = packageJson.bin?.redocly ?? 'bin/cli.js';
const publishDirName = packageJson.publishConfig?.directory ?? '.publish';
const publishDir = path.join(packageDir, publishDirName);

rmSync(publishDir, { recursive: true, force: true });
mkdirSync(path.join(publishDir, path.dirname(binEntrypoint)), { recursive: true });

copyFileSync(path.join(packageDir, binEntrypoint), path.join(publishDir, binEntrypoint));
cpSync(path.join(packageDir, 'lib'), path.join(publishDir, 'lib'), { recursive: true });
copyFileSync(readmeSourcePath, path.join(publishDir, 'README.md'));
copyFileSync(licenseSourcePath, path.join(publishDir, 'LICENSE'));

const publishPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  license: packageJson.license,
  type: packageJson.type,
  bin: packageJson.bin,
  repository: packageJson.repository,
  homepage: packageJson.homepage,
  keywords: packageJson.keywords,
  contributors: packageJson.contributors,
  engines: packageJson.engines,
  engineStrict: packageJson.engineStrict,
  files: [binEntrypoint, 'lib/', 'README.md', 'LICENSE'],
};

writeFileSync(
  path.join(publishDir, 'package.json'),
  `${JSON.stringify(publishPackageJson, null, 2)}\n`
);
