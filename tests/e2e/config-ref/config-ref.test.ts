// The project's root redocly.yaml only references config/redocly.yaml, which pulls its sections
// in with `$ref`: an api from a deeper folder, a `$ref` with a sibling option, a `$ref` chain,
// and `../` paths. Every command below must find the files that these paths point to.
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanupOutput, getCommandOutput, getParams } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
const testPath = join(__dirname, 'project');

// recheck prints wall-clock timings; they are not stable across runs.
function run(args: string[]) {
  return cleanupOutput(getCommandOutput(getParams(indexEntryPoint, args), { testPath })).replace(
    /Completed in \d+(\.\d+)?m?s/g,
    'Completed in <time>'
  );
}

function generated(path: string) {
  return readFileSync(join(testPath, path), 'utf8');
}

function snapshot(name: string) {
  return join(__dirname, 'snapshots', `${name}.txt`);
}

describe('config-ref', () => {
  afterEach(() => {
    for (const dir of ['config/generated', 'out']) {
      rmSync(join(testPath, dir), { recursive: true, force: true });
    }
  });

  test('check-config accepts the referenced config', async () => {
    await expect(run(['check-config'])).toMatchFileSnapshot(snapshot('check-config'));
  });

  test('lint finds every api root', async () => {
    await expect(run(['lint'])).toMatchFileSnapshot(snapshot('lint'));
  });

  test('bundle writes each output and applies the overlays', async () => {
    await expect(run(['bundle'])).toMatchFileSnapshot(snapshot('bundle'));
    expect(generated('config/generated/cafe.yaml')).not.toContain('/stats');
    expect(existsSync(join(testPath, 'config/generated/orders.yaml'))).toBe(true);
    expect(existsSync(join(testPath, 'config/generated/menu.yaml'))).toBe(true);
  });

  test.each([
    ['cafe', 'Cafe API template'],
    ['orders', 'Root template'],
  ])('build-docs %s uses the htmlTemplate of its level', (api, title) => {
    run(['build-docs', api, '-o', `out/${api}.html`]);
    expect(generated(`out/${api}.html`)).toContain(`<title>${title}</title>`);
  });

  test('join reads both api roots', async () => {
    await expect(run(['join', 'cafe', 'orders'])).toMatchFileSnapshot(snapshot('join'));
  });

  test('stats reads the api root', async () => {
    await expect(run(['stats', 'cafe'])).toMatchFileSnapshot(snapshot('stats'));
  });

  test('recheck reads the markdoc tags file', async () => {
    await expect(run(['recheck', 'docs'])).toMatchFileSnapshot(snapshot('recheck'));
  });

  test('generate-client writes the client, the setup and the composed cli', () => {
    run(['generate-client']);
    expect(generated('config/generated/client/cafe.ts')).toContain('https://setup.example.com');
    expect(existsSync(join(testPath, 'config/generated/bin/cafe.ts'))).toBe(true);
  }, 60_000);
});
