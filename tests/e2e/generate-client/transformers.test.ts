//
// e2e for the `transformers` generator paired with the sdk `--date-type Date`
// knob. Two tiers:
//
//  - TYPE-CHECK: generate `sdk,transformers --date-type Date` into a temp dir,
//    assert the sdk types `Date` for date fields and the transformers module has
//    `transform<Name>` with `new Date(`, then strict-`tsc` `client.ts` +
//    `client.transformers.ts` TOGETHER. tsc exit 0 proves each generated
//    `transform<Name>(data: <Name>): <Name>` type-checks against the Date-typed
//    sdk schema (incl. the union-ref guarded-cast and the collection write-backs).
//
//  - RUNTIME: generate into a fixed, checked-in consumer dir and dynamic-
//    `import()` the generated `client.transformers.ts` (its only import of
//    `./client.js` is `import type`, erased at runtime — no sdk needed at
//    runtime). Call `transformPet` on WIRE data and assert the date positions
//    became `Date` instances: top-level scalar, array elements, and the ref'd
//    nested date (proving composition + write-back at runtime).
//
//  - DEFAULT UNCHANGED: without `--date-type Date` the sdk date field stays
//    typed `string` (the byte-identical default).

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cli = join(repoRoot, 'packages/cli/lib/index.js');
const tscBin = join(repoRoot, 'node_modules/.bin/tsc');
const fixture = join(__dirname, 'fixtures', 'transformers.yaml');
const consumerDir = join(__dirname, 'transformers-consumer');

function generate(out: string, args: string[]): void {
  const res = spawnSync(
    'node',
    [cli, 'generate-client', fixture, '--output', out, '--generators', ...args],
    { encoding: 'utf-8', cwd: repoRoot }
  );
  expect(res.status, res.stderr).toBe(0);
}

describe('generate-client transformers generator', () => {
  it('emits Date-typed sdk + a transformers module that strict-tsc-checks together', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-transformers-'));
    const out = join(dir, 'client.ts');
    const transformersOut = join(dir, 'client.transformers.ts');

    generate(out, ['sdk,transformers', '--date-type', 'Date']);

    expect(existsSync(out)).toBe(true);
    expect(existsSync(transformersOut)).toBe(true);

    // The sdk emits `Date` (not `string`) for the date-time field under --date-type Date.
    const sdkSource = readFileSync(out, 'utf-8');
    expect(sdkSource).toContain('createdAt?: Date;');

    // The transformers module: a type-only import, the transform fn, and `new Date(`.
    const transformersSource = readFileSync(transformersOut, 'utf-8');
    expect(transformersSource).toContain('import type {');
    expect(transformersSource).toContain('export const transformPet');
    expect(transformersSource).toContain('new Date(');

    // strict-tsc the sdk + transformers TOGETHER: proves transform<Name>(data:
    // <Name>): <Name> type-checks against the Date-typed sdk schema.
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
          types: [],
        },
        include: ['client.ts', 'client.transformers.ts'],
      }),
      'utf-8'
    );

    const tsc = spawnSync(tscBin, ['--noEmit', '-p', dir], { encoding: 'utf-8', cwd: repoRoot });
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);

    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('transformPet converts top-level, array, and ref nested dates at runtime', async () => {
    const sdkFile = join(consumerDir, 'client.ts');
    const transformersFile = join(consumerDir, 'client.transformers.ts');
    for (const f of [sdkFile, transformersFile]) if (existsSync(f)) rmSync(f, { force: true });

    generate(sdkFile, ['sdk,transformers', '--date-type', 'Date']);
    expect(existsSync(transformersFile)).toBe(true);

    const mod = await import(transformersFile);

    const result = mod.transformPet({
      id: 1,
      name: 'rex',
      createdAt: '2020-01-02T03:04:05Z',
      dates: ['2021-01-01T00:00:00Z', '2022-02-02T00:00:00Z'],
      owner: { name: 'sam', since: '2019-06-01' },
    });

    // Top-level scalar.
    expect(result.createdAt).toBeInstanceOf(Date);
    expect((result.createdAt as Date).toISOString()).toBe('2020-01-02T03:04:05.000Z');
    // Array elements (write-back via map).
    expect(Array.isArray(result.dates)).toBe(true);
    for (const d of result.dates) expect(d).toBeInstanceOf(Date);
    // Ref'd nested date (composition: transformPet -> transformOwner).
    expect(result.owner.since).toBeInstanceOf(Date);

    for (const f of [sdkFile, transformersFile]) if (existsSync(f)) rmSync(f, { force: true });
  }, 60_000);

  it('without --date-type Date the sdk date field stays typed string (default)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-transformers-default-'));
    const out = join(dir, 'client.ts');
    generate(out, ['sdk']);
    expect(readFileSync(out, 'utf-8')).toContain('createdAt?: string;');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});
