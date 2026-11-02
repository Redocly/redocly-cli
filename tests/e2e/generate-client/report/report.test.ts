import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

  function generate(args: string[], api = fixture, reportPath = join(outputDir, 'report.json')) {
    const output = getCommandOutput(
      [
        cliEntry,
        'generate-client',
        api,
        '--output',
        join(outputDir, 'client.ts'),
        '--report',
        reportPath,
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
        "findings": [],
      }
    `);
  });

  it('writes the findings of a custom generator', async () => {
    await expect(
      generate(['--generator', join(__dirname, 'finding-generator.mjs')])
    ).toMatchFileSnapshot(join(snapshots, 'custom-generator-findings.txt'));
    expect(readReport().apis[0].findings).toMatchInlineSnapshot(`
      [
        {
          "kind": "name-changed",
          "message": "schema "Error" is a name a generated client already declares, so it is emitted as "Error_2" — the reserved set spans every target language, so one schema keeps one name across the SDKs you generate.",
          "operations": [],
        },
        {
          "kind": "operation-skipped",
          "message": "finding-generator skipped listMenuItems.",
          "operations": [
            "listMenuItems",
          ],
        },
      ]
    `);
  });

  it('writes the error of a failed generation', async () => {
    await expect(generate(['--generator', 'sdk'])).toMatchFileSnapshot(
      join(snapshots, 'generation-failed.txt')
    );
    expect(readReport().apis[0].findings).toMatchInlineSnapshot(`
      [
        {
          "kind": "name-changed",
          "message": "schema "Error" is a name a generated client already declares, so it is emitted as "Error_2" — the reserved set spans every target language, so one schema keeps one name across the SDKs you generate.",
          "operations": [],
        },
        {
          "kind": "generation-failed",
          "message": "The "sdk" generator is now named "typescript". Update the \`generators\` list or the --generator flag.",
          "operations": [],
        },
      ]
    `);
  });

  it('writes the error of an invalid client config', async () => {
    await expect(generate(['--server-url', 'api.example.com'])).toMatchFileSnapshot(
      join(snapshots, 'invalid-client-config.txt')
    );
    expect(readReport()).toMatchInlineSnapshot(`
      {
        "apis": [
          {
            "findings": [
              {
                "kind": "generation-failed",
                "message": "serverUrl must be an absolute URL (https://api.example.com) or a root-relative path (/v1) — set via --server-url or the \`client\` block in redocly.yaml. Got: api.example.com",
                "operations": [],
              },
            ],
            "name": "cafe",
            "operations": [],
          },
        ],
        "findings": [],
      }
    `);
  });

  it('fails the run on a custom generator finding without the documented shape', async () => {
    await expect(
      generate(['--generator', join(__dirname, 'invalid-finding-generator.mjs')])
    ).toMatchFileSnapshot(join(snapshots, 'invalid-finding.txt'));
    expect(readReport().apis[0].findings.at(-1)).toMatchInlineSnapshot(`
      {
        "kind": "generation-failed",
        "message": "Generator "invalid-finding-generator" failed: invalid finding "oops": a finding is { kind, message, operations }, with a known kind and the operation IDs as strings.",
        "operations": [],
      }
    `);
  });

  it('replaces an old report when the run fails before any API', async () => {
    writeFileSync(join(outputDir, 'report.json'), '{ "old": true }\n');
    await expect(generate([], join(__dirname, 'missing.yaml'))).toMatchFileSnapshot(
      join(snapshots, 'failed-before-any-api.txt')
    );
    expect(readReport()).toMatchInlineSnapshot(`
      {
        "apis": [],
        "findings": [
          {
            "kind": "generation-failed",
            "message": "Please provide a valid path.",
            "operations": [],
          },
        ],
      }
    `);
  });

  it('does not write the report over a generated file', async () => {
    await expect(generate([], fixture, join(outputDir, 'client.ts'))).toMatchFileSnapshot(
      join(snapshots, 'report-over-generated-file.txt')
    );
    expect(readFileSync(join(outputDir, 'client.ts'), 'utf-8')).not.toMatch(/^\{/);
  });

  it('names the report path when the report cannot be written', async () => {
    mkdirSync(join(outputDir, 'report.json'));
    await expect(generate([])).toMatchFileSnapshot(join(snapshots, 'report-not-written.txt'));
  });

  it('keeps the generation error when the report cannot be written either', async () => {
    mkdirSync(join(outputDir, 'report.json'));
    await expect(generate(['--server-url', 'api.example.com'])).toMatchFileSnapshot(
      join(snapshots, 'report-not-written-after-failure.txt')
    );
  });
});
