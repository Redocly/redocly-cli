// The project's root redocly.yaml only references config/redocly.yaml. That file writes some
// sections and apis inline, pulls others in with `$ref` from deeper folders and from the project
// root above it, and mixes a `$ref` with a sibling option, a `$ref` chain, a `$ref` on a path
// field itself two levels down, `../` paths that climb one to four levels back up, and a `$ref`
// over https into a config whose `root` is a URL. Every command below must find the files
// that these paths point to.
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanupOutput, getCommandOutput, getParams } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
const testPath = join(__dirname, 'project');

function run(args: string[]) {
  return cleanupOutput(getCommandOutput(getParams(indexEntryPoint, args), { testPath }));
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
    for (const api of ['cafe', 'cafe-nested']) {
      expect(generated(`config/generated/${api}.yaml`), api).not.toContain('/stats');
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
