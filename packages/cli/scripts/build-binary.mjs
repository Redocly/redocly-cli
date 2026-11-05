// Compiles the bundle in lib/ into a standalone binary with Bun: `npm run compile` builds lib/ first.
// Usage: node scripts/build-binary.mjs <Bun target, for example bun-linux-x64> <output file>
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [target, outputFile] = process.argv.slice(2);
if (!target || !outputFile) {
  throw new Error('Usage: node scripts/build-binary.mjs <Bun target> <output file>');
}

const libDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib');

// The CLI reads these files next to its chunks through `import.meta.url`. Bun embeds each one at
// the same path relative to lib/, so the chunks find them inside the binary.
const assets = [
  'chunks/redoc.standalone.js',
  'chunks/index.aff',
  'chunks/index.dic',
  'skills',
  'eject-assets',
];

const result = spawnSync(
  'bun',
  [
    'build',
    '--compile',
    `--target=${target}`,
    '--splitting',
    // The CLI loads .env itself and has no use for bunfig.toml.
    '--no-compile-autoload-dotenv',
    '--no-compile-autoload-bunfig',
    ...assets.map((asset) => `--asset=${asset}`),
    '../bin/cli.js',
    `--outfile=${path.resolve(outputFile)}`,
  ],
  { cwd: libDir, stdio: 'inherit' }
);

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
