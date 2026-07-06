import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
const fixtures = join(__dirname, 'fixtures');
const snapshots = join(__dirname, '__snapshots__');

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// The report embeds a random run id, random per-finding ids, and a wall-clock
// duration. Scrub them so snapshots are stable across runs.
function cleanupDrift(output: string): string {
  return cleanupOutput(output)
    .replace(UUID_RE, '<uuid>')
    .replace(/Duration: \d+ms/g, 'Duration: <ms>ms')
    .replace(/"durationMs": \d+/g, '"durationMs": <ms>');
}

function runDrift(args: string[]): { output: string; code: number | null } {
  const result = spawnSync('node', [indexEntryPoint, 'drift', ...args], {
    encoding: 'utf-8',
    stdio: 'pipe',
    cwd: fixtures,
    env: { ...process.env, NODE_ENV: 'test', NO_COLOR: 'TRUE', FORCE_COLOR: '0' },
  });

  if (result.error) {
    throw new Error(`Command execution failed: ${result.error.message}`);
  }

  const out = result.stdout?.toString() ?? '';
  const err = result.stderr?.toString() ?? '';
  return { output: cleanupDrift(`${out}\n${err}`), code: result.status };
}

async function matchSnapshot(name: string, output: string): Promise<void> {
  await expect(output).toMatchFileSnapshot(join(snapshots, `${name}.txt`));
}

describe('drift - validate mode', () => {
  test('clean traffic against a matching spec produces no findings', async () => {
    const { output } = runDrift([
      'traffic-matched.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint,schema-consistency',
    ]);
    await matchSnapshot('validate-clean', output);
  });

  test('undocumented endpoints are reported', async () => {
    const { output } = runDrift([
      'traffic-undocumented.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint',
    ]);
    await matchSnapshot('validate-undocumented', output);
  });

  test('response schema mismatch is reported', async () => {
    const { output } = runDrift([
      'traffic-schema-mismatch.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'schema-consistency',
    ]);
    await matchSnapshot('validate-schema-mismatch', output);
  });

  test('missing authentication is reported against a secured spec', async () => {
    const { output } = runDrift([
      'traffic-missing-auth.ndjson',
      '--api',
      'secured-openapi.yaml',
      '--rules',
      'security-baseline',
    ]);
    await matchSnapshot('validate-security', output);
  });

  test('server override maps traffic onto spec paths and skips other hosts', async () => {
    const { output } = runDrift([
      'traffic-prefixed.ndjson',
      '--api',
      'openapi.yaml',
      '--server',
      'localhost:9000',
      '--rules',
      'undocumented-endpoint,schema-consistency',
    ]);
    await matchSnapshot('validate-server', output);
  });

  test('readOnly and writeOnly required fields are not enforced on the wrong side', async () => {
    const { output } = runDrift([
      'traffic-readonly.ndjson',
      '--api',
      'readonly-openapi.yaml',
      '--rules',
      'schema-consistency',
    ]);
    await matchSnapshot('validate-readonly', output);
  });

  test('validates composed schemas (allOf, oneOf, anyOf)', async () => {
    const { output } = runDrift([
      'traffic-composition.ndjson',
      '--api',
      'composition-openapi.yaml',
      '--rules',
      'schema-consistency',
    ]);
    await matchSnapshot('validate-composition', output);
  });

  test('reports a server mismatch instead of an undocumented endpoint for unknown hosts', async () => {
    const { output } = runDrift([
      'traffic-host-mismatch.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint',
    ]);
    await matchSnapshot('validate-host-mismatch', output);
  });

  test('warns when multiple descriptions document the same operation for one server', async () => {
    const { output } = runDrift([
      'traffic-matched.ndjson',
      '--api',
      'colliding-apis',
      '--rules',
      'undocumented-endpoint',
    ]);
    await matchSnapshot('validate-colliding-specs', output);
  });

  test('validates recursive schemas without stack overflow', async () => {
    const { output } = runDrift([
      'traffic-recursive.ndjson',
      '--api',
      'recursive-openapi.yaml',
      '--rules',
      'schema-consistency',
    ]);
    await matchSnapshot('validate-recursive', output);
  });

  test('discards findings below --min-severity', async () => {
    const { output } = runDrift([
      'traffic-mixed-severity.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint,schema-consistency',
      '--min-severity',
      'error',
    ]);
    await matchSnapshot('validate-min-severity', output);
  });

  test('writes the drift report to a file with --output', () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'drift-report-'));
    const outputFile = join(outputDir, 'report.json');
    try {
      const { output, code } = runDrift([
        'traffic-undocumented.ndjson',
        '--api',
        'openapi.yaml',
        '--rules',
        'undocumented-endpoint',
        '--format',
        'json',
        '--output',
        outputFile,
      ]);
      expect(code).toBe(1);
      expect(output).toContain('Drift report written to:');
      expect(output).not.toContain('"problems"');
      const report = JSON.parse(readFileSync(outputFile, 'utf-8'));
      expect(report.run.undocumentedExchanges).toBe(2);
      expect(report.problems).toHaveLength(2);
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });
});

describe('drift - input formats', () => {
  test('parses HAR traffic', async () => {
    const { output } = runDrift([
      'traffic.har',
      '--api',
      'openapi.yaml',
      '--traffic-format',
      'har',
      '--rules',
      'undocumented-endpoint',
    ]);
    await matchSnapshot('format-har', output);
  });

  test('parses Kong traffic', async () => {
    const { output } = runDrift([
      'traffic.kong.json',
      '--api',
      'openapi.yaml',
      '--traffic-format',
      'kong',
      '--rules',
      'undocumented-endpoint',
    ]);
    await matchSnapshot('format-kong', output);
  });

  test('parses Nginx JSON traffic', async () => {
    const { output } = runDrift([
      'nginx-access.ndjson',
      '--api',
      'openapi.yaml',
      '--traffic-format',
      'nginx-json',
      '--rules',
      'undocumented-endpoint',
    ]);
    await matchSnapshot('format-nginx-json', output);
  });

  test('parses Apache JSON traffic', async () => {
    const { output } = runDrift([
      'apache-access.ndjson',
      '--api',
      'openapi.yaml',
      '--traffic-format',
      'apache-json',
      '--rules',
      'undocumented-endpoint',
    ]);
    await matchSnapshot('format-apache-json', output);
  });

  test('auto-detects NDJSON traffic', async () => {
    const { output } = runDrift([
      'traffic-undocumented.ndjson',
      '--api',
      'openapi.yaml',
      '--traffic-format',
      'auto',
      '--rules',
      'undocumented-endpoint',
    ]);
    await matchSnapshot('format-auto-ndjson', output);
  });
});

describe('drift - output formats', () => {
  test('renders JSON output', async () => {
    const { output } = runDrift([
      'traffic-undocumented.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint',
      '--format',
      'json',
    ]);
    await matchSnapshot('output-json', output);
  });

  test('renders CSV output', async () => {
    const { output } = runDrift([
      'traffic-undocumented.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint',
      '--format',
      'csv',
    ]);
    await matchSnapshot('output-csv', output);
  });

  test('renders SARIF output', async () => {
    const { output } = runDrift([
      'traffic-undocumented.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint',
      '--format',
      'sarif',
    ]);
    await matchSnapshot('output-sarif', output);
  });
});

describe('drift - exit codes', () => {
  test('exits 0 when no error-level drift is found', () => {
    const { code } = runDrift([
      'traffic-matched.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint,schema-consistency',
    ]);
    expect(code).toBe(0);
  });

  test('exits 1 when error-level drift is found', () => {
    const { code } = runDrift([
      'traffic-undocumented.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint',
    ]);
    expect(code).toBe(1);
  });

  test('rejects --server combined with --match-mode', () => {
    const { code, output } = runDrift([
      'traffic-prefixed.ndjson',
      '--api',
      'openapi.yaml',
      '--server',
      'localhost:9000',
      '--match-mode',
      'basepath',
    ]);
    expect(code).toBe(1);
    expect(output).toContain('mutually exclusive');
  });
});
