// The project's root redocly.yaml only references config/redocly.yaml. That file writes some
// sections and apis inline, pulls others in with `$ref` from deeper folders and from the project
// root above it, and mixes a `$ref` with a sibling option, a `$ref` chain, a `$ref` on a path
// field itself two levels down, `../` paths that climb one to four levels back up, and a `$ref`
// over https into a config whose `root` is a URL. Every command below must find the files
// that these paths point to. A second root config, written by the test because its `$ref` is a
// `file://` URL of this machine, points at an api config of the project the same way.
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { cleanupOutput, getCommandOutput, getParams } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
const testPath = join(__dirname, 'project');
const snapshots = join(__dirname, '__snapshots__');

function run(args: string[]) {
  return cleanupOutput(getCommandOutput(getParams(indexEntryPoint, args), { testPath }));
}

describe('config-ref', () => {
  afterEach(() => {
    for (const written of ['config/generated', 'out', 'openapi.yaml', 'redocly-file-url.yaml']) {
      rmSync(join(testPath, written), { recursive: true, force: true });
    }
  });

  test('check-config accepts the referenced config', async () => {
    await expect(run(['check-config'])).toMatchFileSnapshot(join(snapshots, 'check-config.txt'));
  });

  test('lint finds every api root', async () => {
    await expect(run(['lint'])).toMatchFileSnapshot(join(snapshots, 'lint.txt'));
  });

  test('bundle writes each output and applies the overlays', async () => {
    await expect(run(['bundle'])).toMatchFileSnapshot(join(snapshots, 'bundle.txt'));
    for (const api of ['cafe', 'cafe-nested']) {
      expect(
        readFileSync(join(testPath, `config/generated/${api}.yaml`), 'utf8'),
        api
      ).not.toContain('/stats');
    }
    for (const api of ['orders', 'menu', 'archive', 'remote']) {
      expect(existsSync(join(testPath, `config/generated/${api}.yaml`)), api).toBe(true);
    }
  });

  test.each([
    ['cafe', 'Cafe API template'],
    ['orders', 'Root template'],
    ['cafe-nested', 'Nested cafe template'],
  ])('build-docs %s uses the htmlTemplate of its level', (api, title) => {
    run(['build-docs', api, '-o', `out/${api}.html`]);
    expect(readFileSync(join(testPath, `out/${api}.html`), 'utf8')).toContain(
      `<title>${title}</title>`
    );
  });

  test('lint and bundle follow a $ref that is a file URL', async () => {
    const apiConfig = pathToFileURL(join(testPath, 'config/apis/orders/config.yaml')).href;
    writeFileSync(
      join(testPath, 'redocly-file-url.yaml'),
      `extends:\n  - recommended\napis:\n  file-url:\n    $ref: ${apiConfig}\n`
    );
    await expect(run(['lint', '--config', 'redocly-file-url.yaml'])).toMatchFileSnapshot(
      join(snapshots, 'lint-file-url.txt')
    );
    run(['bundle', '--config', 'redocly-file-url.yaml']);
    expect(readFileSync(join(testPath, 'config/generated/orders.yaml'), 'utf8')).not.toContain(
      '/stats'
    );
  });

  test('join reads both api roots', async () => {
    await expect(run(['join', 'cafe', 'orders'])).toMatchFileSnapshot(join(snapshots, 'join.txt'));
  });

  test('stats reads the api root', async () => {
    await expect(run(['stats', 'cafe'])).toMatchFileSnapshot(join(snapshots, 'stats.txt'));
  });

  test('recheck reads the markdoc tags file', async () => {
    await expect(run(['recheck', 'docs'])).toMatchFileSnapshot(join(snapshots, 'recheck.txt'));
  });

  test('generate-client writes the client, the setup and the composed cli', () => {
    run(['generate-client']);
    expect(readFileSync(join(testPath, 'config/generated/client/cafe.ts'), 'utf8')).toContain(
      'https://setup.example.com'
    );
    expect(existsSync(join(testPath, 'config/generated/bin/cafe.ts'))).toBe(true);
  }, 60_000);
});
