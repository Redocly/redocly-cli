// Compiles the bundle in lib/ into a standalone binary with Bun: `npm run compile` builds lib/ first.
// Usage: node scripts/build-binary.mjs <Bun target, for example bun-linux-x64> <output file>
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [target, outputFile] = process.argv.slice(2);
if (!target || !outputFile) {
  throw new Error('Usage: node scripts/build-binary.mjs <Bun target> <output file>');
}

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { imports } = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf-8'));

// The CLI finds its files through the `imports` of package.json, for example `#skills/*`, and the
// binary has no package.json. Bun embeds each file or folder at the root of the binary, where every
// chunk also sits, so the binary build rewrites `#skills/` to `./skills/` in a copy of lib/.
const assets = Object.values(imports).map((importTarget) =>
  importTarget.replace(/^\.\/lib\//, '').replace(/\/\*$/, '')
);
// The spelling dictionary is read next to its chunk through `import.meta.url`.
assets.push('chunks/index.aff', 'chunks/index.dic');

const buildDir = mkdtempSync(path.join(tmpdir(), 'redocly-binary-'));
try {
  cpSync(path.join(packageDir, 'lib'), path.join(buildDir, 'lib'), { recursive: true });
  cpSync(path.join(packageDir, 'bin'), path.join(buildDir, 'bin'), { recursive: true });

  for (const bundleDir of [path.join(buildDir, 'lib'), path.join(buildDir, 'lib', 'chunks')]) {
    for (const file of readdirSync(bundleDir).filter((name) => name.endsWith('.js'))) {
      const filePath = path.join(bundleDir, file);
      const source = readFileSync(filePath, 'utf-8');
      const rewritten = source.replace(
        /import\.meta\.resolve\((["'`])#/g,
        'import.meta.resolve($1./'
      );
      if (rewritten !== source) {
        writeFileSync(filePath, rewritten);
      }
    }
  }

  const result = spawnSync(
    'bun',
    [
      'build',
      '--compile',
      `--target=${target}`,
      '--splitting',
      '--define=REDOCLY_STANDALONE_BINARY=true',
      // The CLI loads .env itself and has no use for bunfig.toml.
      '--no-compile-autoload-dotenv',
      '--no-compile-autoload-bunfig',
      ...assets.map((asset) => `--asset=${asset}`),
      '../bin/cli.js',
      `--outfile=${path.resolve(outputFile)}`,
    ],
    { cwd: path.join(buildDir, 'lib'), stdio: 'inherit' }
  );

  if (result.error) {
    throw result.error;
  }
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(buildDir, { recursive: true, force: true });
}
