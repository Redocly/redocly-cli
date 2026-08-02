// Certification-bar helpers: generate a client from a real-world description and
// hold each language's output to a compile bar. Runs as its own vitest suite
// (`npm run harness`) and CI workflow — never inside the regular e2e job.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, strictTypecheck } from '../../e2e/generate-client/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Pinned commit of github/rest-api-description; bump deliberately. */
export const GITHUB_DESCRIPTION_SHA = '5e28810649ba41b5483753ba74f976f83856a504';

const cacheDir = join(__dirname, '../.cache');

/** Download `api.github.com.json` at the pinned SHA once; later runs hit the cache. */
export async function fetchGithubDescription(): Promise<string> {
  const cached = join(cacheDir, `api.github.com-${GITHUB_DESCRIPTION_SHA.slice(0, 12)}.json`);
  if (existsSync(cached)) return cached;
  const url = `https://raw.githubusercontent.com/github/rest-api-description/${GITHUB_DESCRIPTION_SHA}/descriptions/api.github.com/api.github.com.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cached, Buffer.from(await response.arrayBuffer()));
  return cached;
}

export const hasPython = spawnSync('python3', ['--version']).status === 0;
export const hasHttpx = hasPython && spawnSync('python3', ['-c', 'import httpx']).status === 0;
export const hasGo = spawnSync('go', ['version']).status === 0;

/** Generate with `--generator <name>` into a fresh temp dir; returns the dir. */
export function generateWith(generator: string, description: string): string {
  const dir = mkdtempSync(join(tmpdir(), `harness-${generator}-`));
  generate(description, join(dir, 'client.ts'), ['--generator', generator]);
  return dir;
}

/** TS bar: the generated client passes a strict `tsc --noEmit`. */
export function typescriptBar(description: string): void {
  const dir = generateWith('sdk', description);
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
  strictTypecheck(dir);
}

/**
 * Python bar: `import client` (executes every dataclass declaration — catches
 * duplicate fields and bad defaults); syntax-only `py_compile` when httpx is absent.
 */
export function pythonBar(description: string): void {
  const dir = generateWith('python', description);
  const check = hasHttpx
    ? spawnSync('python3', ['-c', 'import client'], { cwd: dir, encoding: 'utf-8' })
    : spawnSync('python3', ['-m', 'py_compile', 'client.py'], { cwd: dir, encoding: 'utf-8' });
  expect(check.status, check.stderr).toBe(0);
}

/** Go bar: `go build` + `go vet` (vet catches json tags on unexported fields). */
export function goBar(description: string): void {
  const dir = generateWith('go', description);
  writeFileSync(join(dir, 'go.mod'), 'module harness.test\n\ngo 1.21\n', 'utf-8');
  const build = spawnSync('go', ['build', './...'], { cwd: dir, encoding: 'utf-8' });
  expect(build.status, build.stderr).toBe(0);
  const vet = spawnSync('go', ['vet', './...'], { cwd: dir, encoding: 'utf-8' });
  expect(vet.status, vet.stderr).toBe(0);
}
