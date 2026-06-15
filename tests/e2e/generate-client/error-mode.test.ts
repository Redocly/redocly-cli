// e2e for `--error-mode result`: the result-shape / typed-errors client.
//
// We assert on the generated source (string checks) and strict-tsc the output
// (single-file and the whole tags-split dir) — this is the same lightweight
// harness used by spec-versions.test.ts. We deliberately do NOT spin up the
// mock-server behavioral harness (base.test.ts / cafe.test.ts), which needs a
// dedicated consumer dir with server.ts/index.ts: strict tsc over the
// discriminated `Result<TData, TError>` already proves the typed `error` flows
// through, and the behavioral retry/abort path is shared (`__send`) and covered
// by the existing throw-mode base e2e. The tags-split case guards the Task-4
// fix that multi-file modes call `__requestResult` (not `__request`).
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cli = join(repoRoot, 'packages/cli/lib/index.js');
const tscBin = join(repoRoot, 'node_modules/.bin/tsc');

const TSCONFIG = {
  compilerOptions: {
    module: 'node16',
    moduleResolution: 'node16',
    target: 'es2022',
    lib: ['ES2022', 'DOM'],
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  },
};

/** Recursively collect every generated `.ts` file under `dir`. */
function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('generate-client error mode', () => {
  it('single-file result mode: typed error alias + Result terminal, strict tsc passes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-errmode-single-'));
    const out = join(dir, 'client.ts');
    const res = spawnSync(
      'node',
      [
        cli,
        'generate-client',
        join(__dirname, 'fixtures', 'error-mode.yaml'),
        '--output',
        out,
        '--error-mode',
        'result',
      ],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(out)).toBe(true);

    const generated = readFileSync(out, 'utf-8');
    expect(generated).toContain('export async function getThing');
    expect(generated).toContain('Promise<Result<');
    expect(generated).toContain('export type GetThingError = ProblemDetails;');
    expect(generated).toContain('__requestResult');

    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({ ...TSCONFIG, include: ['client.ts'] }),
      'utf-8'
    );
    const tsc = spawnSync(tscBin, ['--noEmit', '-p', dir], { encoding: 'utf-8', cwd: repoRoot });
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('tags-split result mode: per-tag endpoints call __requestResult, strict tsc passes over the dir', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-errmode-split-'));
    // Multi-file modes take a `.ts` entry path; per-tag dirs are written beside it.
    const entry = join(dir, 'client.ts');
    const res = spawnSync(
      'node',
      [
        cli,
        'generate-client',
        join(__dirname, 'fixtures', 'error-mode.yaml'),
        '--output',
        entry,
        '--error-mode',
        'result',
        '--output-mode',
        'tags-split',
      ],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(entry)).toBe(true);

    const files = collectTsFiles(dir);
    const contents = files.map((f) => ({ f, src: readFileSync(f, 'utf-8') }));

    // The endpoint call site must use the result terminal in multi-file modes
    // (Task-4 fix) — at least one file calls `__requestResult`, and no file
    // contains a bare throw-mode `__request<` call.
    expect(contents.some(({ src }) => src.includes('__requestResult'))).toBe(true);
    for (const { f, src } of contents) {
      // `__requestResult<` is fine; a bare throw-mode `__request<` is not.
      expect(
        /__request</.test(src.replace(/__requestResult/g, '')),
        `bare __request< in ${f}`
      ).toBe(false);
    }

    // Strict tsc over the whole tree (bundler resolution handles the `.js` ESM imports).
    const tsc = spawnSync(
      tscBin,
      [
        '--noEmit',
        '--strict',
        '--noUnusedLocals',
        '--target',
        'ES2020',
        '--module',
        'esnext',
        '--moduleResolution',
        'bundler',
        '--lib',
        'ES2020,DOM',
        ...files,
      ],
      { encoding: 'utf-8', cwd: dir }
    );
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});
