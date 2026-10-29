import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getCommandOutput } from '../helpers.js';

const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
const { version } = JSON.parse(readFileSync('packages/cli/package.json', 'utf-8'));
// The tests pipe the output, so this makes the CLI see a terminal.
const terminalStderr = ['--import', 'data:text/javascript,process.stderr.isTTY=true'];

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

  test('shows the announcement in a terminal on the first run only', () => {
    expect(
      getCommandOutput([...terminalStderr, indexEntryPoint, 'check-config'], {
        testPath: home,
        env: { HOME: home, TMPDIR: temp, NODE_ENV: '', CI: '' },
      })
    ).toMatchInlineSnapshot(`
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
    expect(
      getCommandOutput([...terminalStderr, indexEntryPoint, 'check-config'], {
        testPath: home,
        env: { HOME: home, TMPDIR: temp, NODE_ENV: '', CI: '' },
      })
    ).toMatchInlineSnapshot(`
      "

      Exit code: 0"
    `);
  });
});
