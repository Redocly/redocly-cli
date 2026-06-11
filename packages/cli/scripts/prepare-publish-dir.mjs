import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
mkdirSync(publishDir, { recursive: true });
mkdirSync(path.dirname(binTargetPath), { recursive: true });
mkdirSync(path.join(publishDir, 'lib'), { recursive: true });

copyFileSync(path.join(packageDir, binEntrypoint), path.join(publishDir, binEntrypoint));
copyFileSync(path.join(packageDir, 'lib/index.js'), path.join(publishDir, 'lib/index.js'));
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
  files: [binEntrypoint, 'lib/index.js', 'README.md', 'LICENSE'],
};

writeFileSync(
  path.join(publishDir, 'package.json'),
  `${JSON.stringify(publishPackageJson, null, 2)}\n`
);
