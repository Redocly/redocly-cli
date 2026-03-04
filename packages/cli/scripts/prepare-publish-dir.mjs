import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, '..');
const rootDir = path.resolve(packageDir, '..', '..');
const publishDir = path.join(packageDir, '.publish');

const packageJsonPath = path.join(packageDir, 'package.json');
const readmeSourcePath = path.join(rootDir, 'README.md');
const licenseSourcePath = path.join(rootDir, 'LICENSE.md');

const compileResult = spawnSync(
  'bun',
  [
    'build',
    'src/index.ts',
    '--target',
    'node',
    '--define',
    'process.env.NODE_ENV=process.env.NODE_ENV',
    '--outfile',
    'lib/index.js',
  ],
  {
    cwd: packageDir,
    stdio: 'inherit',
  }
);

if (compileResult.error) {
  throw compileResult.error;
}

if (compileResult.status !== 0) {
  process.exit(compileResult.status ?? 1);
}

rmSync(publishDir, { recursive: true, force: true });
mkdirSync(publishDir, { recursive: true });

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const binEntrypoint = packageJson.bin?.redocly ?? 'bin/cli.js';
const binTargetPath = path.join(publishDir, binEntrypoint);

mkdirSync(path.dirname(binTargetPath), { recursive: true });
mkdirSync(path.join(publishDir, 'lib'), { recursive: true });

copyFileSync(path.join(packageDir, binEntrypoint), binTargetPath);
copyFileSync(path.join(packageDir, 'lib/index.js'), path.join(publishDir, 'lib/index.js'));
copyFileSync(readmeSourcePath, path.join(publishDir, 'README.md'));
copyFileSync(licenseSourcePath, path.join(publishDir, 'LICENSE'));

const publishPackageJson = compactObject({
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  license: packageJson.license,
  type: packageJson.type,
  repository: packageJson.repository,
  homepage: packageJson.homepage,
  keywords: packageJson.keywords,
  contributors: packageJson.contributors,
  engines: packageJson.engines,
  engineStrict: packageJson.engineStrict,
  bin: {
    redocly: binEntrypoint,
    openapi: binEntrypoint,
  },
  files: [binEntrypoint, 'lib/index.js', 'README.md', 'LICENSE'],
});

writeFileSync(
  path.join(publishDir, 'package.json'),
  `${JSON.stringify(publishPackageJson, null, 2)}\n`
);

function compactObject(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);
  return Object.fromEntries(entries);
}
