// Query-parameter serialization styles (P3.8). Generates a client from a spec
// declaring non-default query styles, strict-`tsc`s it (the `styles` object
// literal + 4th-arg `__buildUrl` call must type-check), asserts the emitted
// source, and proves the WIRE FORMAT behaviorally.
//
// Behavioral approach: rather than stand up a mock server, we import the
// generated client and stub `config.fetch` (via `configure`) to capture the
// request URL, then assert it directly. This is the lightest harness that
// proves `__buildUrl`'s output (literal delimiters + allowReserved on the
// wire), which is the whole point of the feature.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cli = join(repoRoot, 'packages/cli/lib/index.js');
const tscBin = join(repoRoot, 'node_modules/.bin/tsc');
const fixture = join(__dirname, 'fixtures', 'query-styles.yaml');

describe('generate-client query serialization styles', () => {
  let dir: string;
  let generated: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'ots-qstyles-'));
    const out = join(dir, 'client.ts');
    const res = spawnSync('node', [cli, 'generate-client', fixture, '--output', out], {
      encoding: 'utf-8',
      cwd: repoRoot,
    });
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(out)).toBe(true);
    generated = readFileSync(out, 'utf-8');
  }, 60_000);

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('emits the styles literal for non-default params and none for the default param', () => {
    // Styled array params carry their explicit style/explode.
    expect(generated).toContain('"tags": { style: "pipeDelimited", explode: false }');
    expect(generated).toContain('"q": { style: "spaceDelimited", explode: false }');
    expect(generated).toContain('"ids": { style: "form", explode: false }');
    // allowReserved param keeps the default form+explode but flags allowReserved.
    expect(generated).toContain('"filter": { style: "form", explode: true, allowReserved: true }');
    // The default param `limit` gets NO styles entry.
    expect(generated).not.toContain('"limit":');
    // The styles literal is passed as the 4th arg to __buildUrl.
    expect(generated).toMatch(/__buildUrl\(__config, `\/search`, params, \{/);
  });

  it('strict-tsc type-checks the generated client', () => {
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
        include: ['client.ts'],
      }),
      'utf-8'
    );
    const tsc = spawnSync(tscBin, ['--noEmit', '-p', dir], { encoding: 'utf-8', cwd: repoRoot });
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  }, 60_000);

  it('serializes the wire format: literal delimiters + allowReserved', () => {
    // A tiny consumer imports the generated client, stubs config.fetch to
    // capture the URL, and writes it to stdout.
    const runner = join(dir, 'run.mts');
    writeFileSync(
      runner,
      [
        `import { search, configure } from './client.ts';`,
        `let captured = '';`,
        `configure({`,
        `  fetch: async (url) => {`,
        `    captured = String(url);`,
        `    return new Response('{"results":[]}', { status: 200, headers: { 'content-type': 'application/json' } });`,
        `  },`,
        `});`,
        `await search({ tags: ['a', 'b'], q: ['x', 'y'], ids: ['1', '2'], filter: 'a/b', limit: 5 });`,
        `process.stdout.write(captured);`,
        ``,
      ].join('\n'),
      'utf-8'
    );
    const run = spawnSync('npx', ['tsx', runner], { encoding: 'utf-8', cwd: dir });
    expect(run.status, `consumer stderr:\n${run.stderr}`).toBe(0);
    const url = run.stdout.trim();
    // pipeDelimited: literal `|` on the wire (NOT %7C).
    expect(url).toContain('tags=a|b');
    // spaceDelimited: literal `%20` space delimiter between values.
    expect(url).toContain('q=x%20y');
    // form + explode:false: literal `,` delimiter.
    expect(url).toContain('ids=1,2');
    // allowReserved: the `/` survives un-encoded (NOT %2F).
    expect(url).toContain('filter=a/b');
    // The default param still encodes normally.
    expect(url).toContain('limit=5');
  }, 60_000);
});
