// Composition of generated CLIs: the generated module is importable (no side effects),
// two descriptions compose behind namespaces with their own credentials, and a custom
// command with a handler joins them at the root — the login story, built in user land.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cliEntry, generate, repoRoot, tsxBin } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let dir: string;

vi.setConfig({ testTimeout: 120_000 });

function runEntry(args: string[], env: Record<string, string> = {}) {
  const result = spawnSync(tsxBin, [join(dir, 'cafe.ts'), ...args], {
    cwd: dir,
    encoding: 'utf-8',
    env: { ...process.env, ...env },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'cli-compose-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
  symlinkSync(join(repoRoot, 'node_modules'), join(dir, 'node_modules'), 'dir');
  // Two descriptions — the same fixture twice is exactly the collision case: every
  // operationId exists in both, so only namespacing can tell them apart.
  generate(join(__dirname, 'fixtures/cli.yaml'), join(dir, 'shop.client.ts'), [
    '--generator',
    'cli',
    '--import-ext',
    'ts',
  ]);
  generate(join(__dirname, 'fixtures/cli.yaml'), join(dir, 'kitchen.client.ts'), [
    '--generator',
    'cli',
    '--import-ext',
    'ts',
  ]);
  // The user-land entry: everything the extension design promises, in ~20 lines.
  writeFileSync(
    join(dir, 'cafe.ts'),
    `import { runCli, type CustomCommand } from '@redocly/client-generator';
import * as shop from './shop.client.cli.ts';
import * as kitchen from './kitchen.client.cli.ts';

const login: CustomCommand = {
  name: 'login',
  summary: 'Store a token for both APIs.',
  flags: [{ name: 'user', param: 'user', type: 'string', required: true }],
  handler: (context) => {
    context.wiring.stdout(JSON.stringify({ loggedIn: context.params.user }));
    return 0;
  },
};

process.exit(
  await runCli(
    [
      { commands: [login], wiring: { ...shop.wiring, binName: 'cafe' } },
      { namespace: 'shop', commands: shop.COMMANDS, wiring: { ...shop.wiring, binName: 'cafe', envPrefix: 'CAFE_SHOP' } },
      { namespace: 'kitchen', commands: kitchen.COMMANDS, wiring: { ...kitchen.wiring, binName: 'cafe', envPrefix: 'CAFE_KITCHEN' } },
    ],
    process.argv.slice(2)
  )
);
`,
    'utf-8'
  );
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('composed CLI (end-to-end)', () => {
  it('importing the generated modules runs nothing; the entry composes them', () => {
    const help = runEntry(['--help']);
    expect(help.code, help.stderr).toBe(0);
    expect(help.stdout).toContain('shop');
    expect(help.stdout).toContain('kitchen');
    expect(help.stdout).toContain('login  Store a token for both APIs.');
  });

  it('routes a namespace to its source with its own credential prefix', () => {
    const dry = runEntry(['shop', 'orders', 'getOrder', 'ord_1', '--dry-run'], {
      CAFE_SHOP_TOKEN: 'shop-secret',
    });
    expect(dry.code, dry.stderr).toBe(0);
    const captured = JSON.parse(dry.stdout);
    expect(captured.url).toContain('/orders/ord_1');
    // The credential arrived (and was redacted) — proving the per-source prefix works.
    expect(JSON.stringify(captured)).not.toContain('shop-secret');
    expect(captured.headers.Authorization).toBe('***');
  });

  it('namespace help shows that API; the same operationId lives in both namespaces', () => {
    const shop = runEntry(['shop', '--help']);
    const kitchen = runEntry(['kitchen', '--help']);
    expect(shop.code).toBe(0);
    expect(kitchen.code).toBe(0);
    expect(shop.stdout).toContain('orders');
    expect(kitchen.stdout).toContain('orders');
  });

  it('the root custom command runs with parsed flags', () => {
    const login = runEntry(['login', '--user', 'sam']);
    expect(login.code, login.stderr).toBe(0);
    expect(JSON.parse(login.stdout)).toEqual({ loggedIn: 'sam' });
  });

  it('an unknown namespace is a usage error naming the real ones', () => {
    const bad = runEntry(['warehouse', 'listOrders']);
    expect(bad.code).toBe(4);
    const message = JSON.parse(bad.stderr).error.message;
    expect(message).toContain('shop');
    expect(message).toContain('kitchen');
  });

  it('each generated CLI still works standalone', () => {
    const standalone = spawnSync(tsxBin, [join(dir, 'shop.client.cli.ts'), '--help'], {
      cwd: dir,
      encoding: 'utf-8',
    });
    expect(standalone.status, standalone.stderr).toBe(0);
    expect(standalone.stdout).toContain('Usage:');
  });
});

describe('config-driven composition (client.cliOutput)', () => {
  let project: string;

  beforeAll(() => {
    project = mkdtempSync(join(tmpdir(), 'cli-output-'));
    writeFileSync(join(project, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
    symlinkSync(join(repoRoot, 'node_modules'), join(project, 'node_modules'), 'dir');
    const fixture = join(__dirname, 'fixtures/cli.yaml');
    writeFileSync(
      join(project, 'redocly.yaml'),
      [
        'extends: []',
        'client:',
        '  binName: cafe',
        '  cliOutput: ./src/cafe.ts',
        '  importExt: ts',
        '  generators: [sdk, zod, cli]',
        'apis:',
        `  shop: { root: ${fixture}, clientOutput: ./src/shop.ts }`,
        `  kitchen: { root: ${fixture}, clientOutput: ./src/kitchen.ts }`,
        '',
      ].join('\n'),
      'utf-8'
    );
    const generated = spawnSync(
      'node',
      [cliEntry, 'generate-client', '--config', join(project, 'redocly.yaml')],
      { cwd: project, encoding: 'utf-8' }
    );
    expect(generated.status, generated.stderr).toBe(0);
  });

  afterAll(() => {
    rmSync(project, { recursive: true, force: true });
  });

  it('one generate run emits the composed entry over every api that selected cli', () => {
    const help = spawnSync(tsxBin, [join(project, 'src/cafe.ts'), '--help'], {
      cwd: project,
      encoding: 'utf-8',
    });
    expect(help.status, help.stderr).toBe(0);
    expect(help.stdout).toContain('Usage: cafe <api> <command>');
    expect(help.stdout).toContain('shop');
    expect(help.stdout).toContain('kitchen');
  });

  it('routes a namespace and reads the alias-scoped credential', () => {
    const dry = spawnSync(
      tsxBin,
      [join(project, 'src/cafe.ts'), 'kitchen', 'orders', 'getOrder', 'ord_7', '--dry-run'],
      { cwd: project, encoding: 'utf-8', env: { ...process.env, CAFE_KITCHEN_TOKEN: 'k-secret' } }
    );
    expect(dry.status, dry.stderr).toBe(0);
    const captured = JSON.parse(dry.stdout);
    expect(captured.url).toContain('/orders/ord_7');
    expect(captured.headers.Authorization).toBe('***');
    expect(JSON.stringify(captured)).not.toContain('k-secret');
  });
});
