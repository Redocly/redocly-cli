import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Bundle the CLI and all its dependencies into a single dependency-free lib/index.js.

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await build({
  absWorkingDir: packageDir,
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20.19',
  // Shim require() for bundled CJS deps that call it under ESM output.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
  logLevel: 'info',
});
