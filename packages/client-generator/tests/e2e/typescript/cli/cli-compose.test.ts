// Composition of generated CLIs: the generated module is importable (no side effects),
// two descriptions compose behind namespaces with their own credentials, and a custom
// command with a handler joins them at the root — the login story, built in user land.
// The `client.cliOutput` config tests are in tests/e2e/generate-client/cli-output.
import { generateClient } from '@redocly/client-generator';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, runTsx } from '../../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let dir: string;

beforeAll(async () => {
  dir = copyConsumer(join(__dirname, 'consumer-compose'));
  // Two descriptions — the same fixture twice is exactly the collision case: every
  // operationId exists in both, so only namespacing can tell them apart.
  await generateClient({
    api: join(__dirname, 'openapi.yaml'),
    output: join(dir, 'shop.client.ts'),
    generators: ['cli'],
    importExt: 'ts',
  });
  await generateClient({
    api: join(__dirname, 'openapi.yaml'),
    output: join(dir, 'kitchen.client.ts'),
    generators: ['cli'],
    importExt: 'ts',
  });
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('composed CLI', () => {
  it('importing the generated modules runs nothing; the entry composes them', async () => {
    const help = await runTsx(join(dir, 'cafe.ts'), ['--help'], { cwd: dir });
    expect(help.status, help.stderr).toBe(0);
    expect(help.stdout).toContain('shop');
    expect(help.stdout).toContain('kitchen');
    expect(help.stdout).toContain('login  Store a token for both APIs.');
  });

  it('routes a namespace to its source with its own credential prefix', async () => {
    const dry = await runTsx(
      join(dir, 'cafe.ts'),
      ['shop', 'orders', 'getOrder', 'ord_1', '--dry-run'],
      { cwd: dir, env: { ...process.env, CAFE_SHOP_TOKEN: 'shop-secret' } }
    );
    expect(dry.status, dry.stderr).toBe(0);
    const captured = JSON.parse(dry.stdout);
    expect(captured.url).toContain('/orders/ord_1');
    // The credential arrived (and was redacted) — proving the per-source prefix works.
    expect(JSON.stringify(captured)).not.toContain('shop-secret');
    expect(captured.headers.Authorization).toBe('***');
  });

  it('takes an operationId without its group, the form the guide shows', async () => {
    // `cafe shop listOrders` — the alias, then a bare operationId, because the name is
    // unambiguous inside that api. The guide documents this shorter form.
    const dry = await runTsx(join(dir, 'cafe.ts'), ['shop', 'getOrder', 'ord_2', '--dry-run'], {
      cwd: dir,
      env: { ...process.env, CAFE_SHOP_TOKEN: 'shop-secret' },
    });
    expect(dry.status, dry.stderr).toBe(0);
    expect(JSON.parse(dry.stdout).url).toContain('/orders/ord_2');
  });

  it('namespace help shows that API; the same operationId lives in both namespaces', async () => {
    const shop = await runTsx(join(dir, 'cafe.ts'), ['shop', '--help'], { cwd: dir });
    const kitchen = await runTsx(join(dir, 'cafe.ts'), ['kitchen', '--help'], { cwd: dir });
    expect(shop.status, shop.stderr).toBe(0);
    expect(kitchen.status, kitchen.stderr).toBe(0);
    expect(shop.stdout).toContain('orders');
    expect(kitchen.stdout).toContain('orders');
  });

  it('the root custom command runs with parsed flags', async () => {
    const login = await runTsx(join(dir, 'cafe.ts'), ['login', '--user', 'sam'], { cwd: dir });
    expect(login.status, login.stderr).toBe(0);
    expect(JSON.parse(login.stdout)).toEqual({ loggedIn: 'sam' });
  });

  it('an unknown namespace is a usage error naming the real ones', async () => {
    const bad = await runTsx(join(dir, 'cafe.ts'), ['warehouse', 'listOrders'], { cwd: dir });
    expect(bad.status).toBe(4);
    const message = JSON.parse(bad.stderr).error.message;
    expect(message).toContain('shop');
    expect(message).toContain('kitchen');
  });

  it('each generated CLI still works standalone', async () => {
    const standalone = await runTsx(join(dir, 'shop.client.cli.ts'), ['--help'], { cwd: dir });
    expect(standalone.status, standalone.stderr).toBe(0);
    expect(standalone.stdout).toContain('Usage:');
  });
});
