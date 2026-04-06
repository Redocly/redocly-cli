import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, '..');
const bunBuildArgs = [
  'build',
  'src/index.ts',
  '--target',
  'node',
  '--define',
  'process.env.NODE_ENV=process.env.NODE_ENV',
  '--outfile',
  'lib/index.js',
];

export function compileCliBundle() {
  const directBun = spawnSync('bun', bunBuildArgs, {
    cwd: packageDir,
    stdio: 'inherit',
  });

  if (!directBun.error) {
    return directBun;
  }

  if (directBun.error.code !== 'ENOENT') {
    throw directBun.error;
  }

  console.warn('Bun binary not found on PATH; falling back to `npx bun@1.3.10`.');
  return spawnSync('npx', ['--yes', 'bun@1.3.10', ...bunBuildArgs], {
    cwd: packageDir,
    stdio: 'inherit',
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const compileResult = compileCliBundle();

  if (compileResult.error) {
    throw compileResult.error;
  }

  if (compileResult.status !== 0) {
    process.exit(compileResult.status ?? 1);
  }
}
