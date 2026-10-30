import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanupOutput, getCommandOutput } from '../../helpers.js';
import { cliEntry, repoRoot } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const snapshots = join(__dirname, '__snapshots__');
const fixture = join(repoRoot, 'resources/cafe.yaml');

describe('generate-client --report', () => {
  let outputDir: string;
  beforeEach(() => {
    outputDir = mkdtempSync(join(tmpdir(), 'generate-client-report-'));
  });
  afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
  });

  function generate(args: string[]): string {
    const output = getCommandOutput(
      [
        cliEntry,
        'generate-client',
        fixture,
        '--output',
        join(outputDir, 'client.ts'),
        '--report',
        join(outputDir, 'report.json'),
        ...args,
      ],
      { testPath: __dirname }
    );
    return cleanupOutput(output).replaceAll(outputDir, '<output>');
  }

  function readReport() {
    return JSON.parse(readFileSync(join(outputDir, 'report.json'), 'utf-8'));
  }

  it('writes the operations and the warnings of the API', async () => {
    await expect(generate([])).toMatchFileSnapshot(join(snapshots, 'operations-and-warnings.txt'));
    expect(readReport()).toMatchInlineSnapshot(`
      {
        "apis": [
          {
            "findings": [
              {
                "kind": "name-changed",
                "message": "schema "Error" is a name a generated client already declares, so it is emitted as "Error_2" — the reserved set spans every target language, so one schema keeps one name across the SDKs you generate.",
                "operations": [],
              },
            ],
            "name": "cafe",
            "operations": [
              {
                "id": "listMenuItems",
                "name": "listMenuItems",
              },
              {
                "id": "createMenuItem",
                "name": "createMenuItem",
              },
              {
                "id": "deleteMenuItem",
                "name": "deleteMenuItem",
              },
              {
                "id": "getMenuItemPhoto",
                "name": "getMenuItemPhoto",
              },
              {
                "id": "listOrders",
                "name": "listOrders",
              },
              {
                "id": "createOrder",
                "name": "createOrder",
              },
              {
                "id": "getOrderById",
                "name": "getOrderById",
              },
              {
                "id": "deleteOrder",
                "name": "deleteOrder",
              },
              {
                "id": "updateOrder",
                "name": "updateOrder",
              },
              {
                "id": "listOrderItems",
                "name": "listOrderItems",
              },
              {
                "id": "getRevenue",
                "name": "getRevenue",
              },
              {
                "id": "registerOAuth2Client",
                "name": "registerOAuth2Client",
              },
            ],
          },
        ],
      }
    `);
  });

  it('writes the findings of a custom generator', async () => {
    await expect(
      generate(['--generator', join(__dirname, 'finding-generator.mjs')])
    ).toMatchFileSnapshot(join(snapshots, 'custom-generator-findings.txt'));
    expect(readReport().apis[0].findings).toContainEqual({
      kind: 'operation-skipped',
      message: 'finding-generator skipped listMenuItems.',
      operations: ['listMenuItems'],
    });
  });

  it('writes the error of a failed generation', async () => {
    await expect(generate(['--generator', 'sdk'])).toMatchFileSnapshot(
      join(snapshots, 'generation-failed.txt')
    );
    expect(readReport().apis[0].findings.at(-1)).toMatchObject({
      kind: 'generation-failed',
      message: expect.stringContaining('The "sdk" generator is now named "typescript"'),
    });
  });
});
