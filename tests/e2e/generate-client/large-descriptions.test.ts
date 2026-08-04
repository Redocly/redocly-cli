// Every generator's output held to a compile/import bar over two large real-world
// descriptions: the vendored one at tests/smoke/rebilly (638 operations, allOf-heavy —
// shook out the allOf pagination fix and the Go `3ds` field-export bug) and GitHub's
// REST description (~1000 operations, downloaded at a pinned SHA — shook out the
// strict-mode reserved-word and +1/-1 naming bugs). The heaviest e2e file by far;
// CI spreads it across shards like any other suite.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, repoRoot, strictTypecheck } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TIMEOUT = 300_000;

/** Pinned commit of github/rest-api-description; bump deliberately. */
const GITHUB_DESCRIPTION_SHA = '5e28810649ba41b5483753ba74f976f83856a504';

const cacheDir = join(__dirname, '.cache');

/** Download `api.github.com.json` at the pinned SHA once; later runs hit the cache. */
async function fetchGithubDescription(): Promise<string> {
  const cached = join(cacheDir, `api.github.com-${GITHUB_DESCRIPTION_SHA.slice(0, 12)}.json`);
  if (existsSync(cached)) return cached;
  const url = `https://raw.githubusercontent.com/github/rest-api-description/${GITHUB_DESCRIPTION_SHA}/descriptions/api.github.com/api.github.com.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cached, Buffer.from(await response.arrayBuffer()));
  return cached;
}

const hasPhp = spawnSync('php', ['--version']).status === 0;
const hasPython = spawnSync('python3', ['--version']).status === 0;
const hasHttpx = hasPython && spawnSync('python3', ['-c', 'import httpx']).status === 0;
const hasGo = spawnSync('go', ['version']).status === 0;

/** Generate with `--generator <name>` (repeatable) into a fresh temp dir; returns the dir. */
function generateWith(generator: string | string[], description: string): string {
  const generators = Array.isArray(generator) ? generator : [generator];
  const dir = mkdtempSync(join(tmpdir(), `large-desc-${generators.join('-')}-`));
  generate(
    description,
    join(dir, 'client.ts'),
    generators.flatMap((name) => ['--generator', name])
  );
  return dir;
}

/** TS bar: the generated client passes a strict `tsc --noEmit`. */
function typescriptBar(description: string): void {
  const dir = generateWith('sdk', description);
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
  strictTypecheck(dir);
}

/** CLI bar: the generated `<stem>.cli.ts` passes a strict, Node-typed `tsc --noEmit`. */
function cliBar(description: string): void {
  const dir = generateWith(['sdk', 'cli'], description);
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'nodenext',
        moduleResolution: 'nodenext',
        target: 'es2022',
        lib: ['ES2022', 'DOM'],
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: ['node'],
        // The temp dir has no node_modules; resolve @types/node from the repo.
        typeRoots: [join(repoRoot, 'node_modules/@types')],
      },
      include: ['**/*.ts'],
    }),
    'utf-8'
  );
  const tsc = spawnSync(join(repoRoot, 'node_modules/.bin/tsc'), ['-p', dir], {
    encoding: 'utf-8',
  });
  expect(tsc.status, `${tsc.stdout}\n${tsc.stderr}`).toBe(0);
}

/**
 * Python bar: `import client` (executes every dataclass declaration — catches
 * duplicate fields and bad defaults); syntax-only `py_compile` when httpx is absent.
 */
function pythonBar(description: string): void {
  const dir = generateWith('python', description);
  const check = hasHttpx
    ? spawnSync('python3', ['-c', 'import client'], { cwd: dir, encoding: 'utf-8' })
    : spawnSync('python3', ['-m', 'py_compile', 'client.py'], { cwd: dir, encoding: 'utf-8' });
  expect(check.status, check.stderr).toBe(0);
}

/** PHP bar: the generated `<stem>.php` parses (`php -l`) and declares (`require`). */
function phpBar(description: string): void {
  const dir = generateWith('php', description);
  const lint = spawnSync('php', ['-l', 'client.php'], { cwd: dir, encoding: 'utf-8' });
  expect(lint.status, `${lint.stdout}\n${lint.stderr}`).toBe(0);
  const declare = spawnSync('php', ['-r', "require 'client.php'; echo 'DECLARED';"], {
    cwd: dir,
    encoding: 'utf-8',
  });
  expect(declare.status, `${declare.stdout}\n${declare.stderr}`).toBe(0);
}

/** Go bar: `go build` + `go vet` (vet catches json tags on unexported fields). */
function goBar(description: string): void {
  const dir = generateWith('go', description);
  writeFileSync(join(dir, 'go.mod'), 'module largedesc.test\n\ngo 1.21\n', 'utf-8');
  const build = spawnSync('go', ['build', './...'], { cwd: dir, encoding: 'utf-8' });
  expect(build.status, build.stderr).toBe(0);
  const vet = spawnSync('go', ['vet', './...'], { cwd: dir, encoding: 'utf-8' });
  expect(vet.status, vet.stderr).toBe(0);
}

const rebilly = join(__dirname, '../../smoke/rebilly/rebilly-description.yaml');

describe('rebilly description', () => {
  it('sdk (TypeScript) passes strict tsc', () => typescriptBar(rebilly), TIMEOUT);
  it('cli passes strict Node-typed tsc', () => cliBar(rebilly), TIMEOUT);
  it.skipIf(!hasPython)('python imports cleanly', () => pythonBar(rebilly), TIMEOUT);
  it.skipIf(!hasGo)('go builds and vets cleanly', () => goBar(rebilly), TIMEOUT);
  it.skipIf(!hasPhp)('php parses and declares cleanly', () => phpBar(rebilly), TIMEOUT);
});

describe('github REST description', () => {
  let github: string;

  beforeAll(async () => {
    github = await fetchGithubDescription();
  }, TIMEOUT);

  it('sdk (TypeScript) passes strict tsc', () => typescriptBar(github), TIMEOUT);
  it('cli passes strict Node-typed tsc', () => cliBar(github), TIMEOUT);
  it.skipIf(!hasPython)('python imports cleanly', () => pythonBar(github), TIMEOUT);
  it.skipIf(!hasGo)('go builds and vets cleanly', () => goBar(github), TIMEOUT);
  it.skipIf(!hasPhp)('php parses and declares cleanly', () => phpBar(github), TIMEOUT);
});
