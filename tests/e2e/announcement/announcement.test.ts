import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getCommandOutput, getParams } from '../helpers.js';

const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
const { version } = JSON.parse(readFileSync('packages/cli/package.json', 'utf-8'));

describe('announcement', () => {
  let home: string;
  let temp: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'announcement-home-'));
    temp = mkdtempSync(join(tmpdir(), 'announcement-temp-'));
    // A fresh cache of the latest version keeps the update notifier quiet and offline.
    writeFileSync(join(temp, 'redocly-cli-version'), version);
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    rmSync(temp, { recursive: true, force: true });
  });

  test('shows the announcement on the first run only', () => {
    const runCheckConfig = () =>
      getCommandOutput(getParams(indexEntryPoint, ['check-config']), {
        testPath: home,
        env: { HOME: home, TMPDIR: temp, NODE_ENV: '', CI: '' },
      });

    expect(runCheckConfig()).toMatchInlineSnapshot(`
      "

          ╔══════════════════════════════════════════════════════════════════╗
          ║                                                                  ║
          ║  Redocly CLI comes with skills for AI coding agents:             ║
          ║                                                                  ║
          ║    redocly-cli         lint, bundle, build docs, test, and more  ║
          ║    redocly-lint-rules  write lint rules and plugins              ║
          ║    recheck-lint        lint the Markdown that the agent changed  ║
          ║    recheck-config      set up recheck in redocly.yaml            ║
          ║                                                                  ║
          ║  Install them in your project: \`redocly skills\`.                 ║
          ║  Docs: https://redocly.com/docs/cli/commands/skills              ║
          ║                                                                  ║
          ╚══════════════════════════════════════════════════════════════════╝


      Exit code: 0"
    `);
    expect(runCheckConfig()).toMatchInlineSnapshot(`
      "

      Exit code: 0"
    `);
  });
});
