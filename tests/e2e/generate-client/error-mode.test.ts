// e2e for `--error-mode result`: the result-shape / typed-errors client.
//
// We assert on the generated source (string checks) and strict-tsc the output
// (single-file and the split two-file set) — this is the same lightweight
// harness used by spec-versions.test.ts. We deliberately do NOT spin up the
// mock-server behavioral harness (base.test.ts / cafe.test.ts), which needs a
// dedicated consumer dir with server.ts/index.ts: strict tsc over the
// discriminated `Result<TData, TError>` already proves the typed `error` flows
// through, and the behavioral retry/abort path is shared (the runtime's `send`)
// and covered by the existing throw-mode base e2e. The split case guards that
// the entry bakes `errorMode: "result"` into the client config too.
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
    module: 'nodenext',
    moduleResolution: 'nodenext',
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
    expect(generated).toContain('export const getThing = (');
    expect(generated).toContain('result: Result<GetThingResult, GetThingError>;');
    expect(generated).toContain('export type GetThingError = ProblemDetails;');
    // The mode is baked into the client instance config (configure() cannot flip it).
    expect(generated).toContain('errorMode: "result"');

    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({ ...TSCONFIG, include: ['client.ts'] }),
      'utf-8'
    );
    const tsc = spawnSync(tscBin, ['--noEmit', '-p', dir], { encoding: 'utf-8', cwd: repoRoot });
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('split result mode: the entry bakes errorMode result, strict tsc passes over both files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-errmode-split-'));
    // Split mode takes a `.ts` entry path; the schemas file is written beside it.
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
        'split',
      ],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(entry)).toBe(true);

    const files = collectTsFiles(dir);
    expect(files.map((f) => f.split('/').pop()).sort()).toEqual(['client.schemas.ts', 'client.ts']);

    // The result shape is baked into the entry: typed Ops results and the instance config.
    const entrySrc = readFileSync(entry, 'utf-8');
    expect(entrySrc).toContain('errorMode: "result"');
    expect(entrySrc).toContain('Result<');

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
