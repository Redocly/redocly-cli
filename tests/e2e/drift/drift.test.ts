import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanupOutput, getCommandOutput, runCommandResult } from '../helpers.js';

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

function runDrift(args: string[]): string {
  return cleanupDrift(
    getCommandOutput([indexEntryPoint, 'drift', ...args], { testPath: fixtures })
  );
}

describe('drift - validate mode', () => {
  test('clean traffic against a matching spec produces no findings', async () => {
    const output = runDrift([
      'traffic-matched.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint,schema-consistency',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'validate-clean.txt'));
  });

  test('undocumented endpoints are reported', async () => {
    const output = runDrift([
      'traffic-undocumented.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'validate-undocumented.txt'));
  });

  test('response schema mismatch is reported', async () => {
    const output = runDrift([
      'traffic-schema-mismatch.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'schema-consistency',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'validate-schema-mismatch.txt'));
  });

  test('missing authentication is reported against a secured spec', async () => {
    const output = runDrift([
      'traffic-missing-auth.ndjson',
      '--api',
      'secured-openapi.yaml',
      '--rules',
      'security-baseline',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'validate-security.txt'));
  });

  test('server override maps traffic onto spec paths and skips other hosts', async () => {
    const output = runDrift([
      'traffic-prefixed.ndjson',
      '--api',
      'openapi.yaml',
      '--server',
      'localhost:9000',
      '--rules',
      'undocumented-endpoint,schema-consistency',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'validate-server.txt'));
  });

  test('readOnly and writeOnly required fields are not enforced on the wrong side', async () => {
    const output = runDrift([
      'traffic-readonly.ndjson',
      '--api',
      'readonly-openapi.yaml',
      '--rules',
      'schema-consistency',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'validate-readonly.txt'));
  });

  test('validates the whole query against a querystring parameter', async () => {
    const output = runDrift([
      'traffic-querystring.ndjson',
      '--api',
      'querystring-openapi.yaml',
      '--rules',
      'schema-consistency',
      '--max-findings',
      '40',
      '--coverage',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'validate-querystring.txt'));
  });

  test('validates composed schemas (allOf, oneOf, anyOf)', async () => {
    const output = runDrift([
      'traffic-composition.ndjson',
      '--api',
      'composition-openapi.yaml',
      '--rules',
      'schema-consistency',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'validate-composition.txt'));
  });

  test('reports a server mismatch instead of an undocumented endpoint for unknown hosts', async () => {
    const output = runDrift([
      'traffic-host-mismatch.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'validate-host-mismatch.txt'));
  });

  test('warns when multiple descriptions document the same operation for one server', async () => {
    const output = runDrift([
      'traffic-matched.ndjson',
      '--api',
      'colliding-apis',
      '--rules',
      'undocumented-endpoint',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'validate-colliding-specs.txt'));
  });

  test('validates recursive schemas without stack overflow', async () => {
    const output = runDrift([
      'traffic-recursive.ndjson',
      '--api',
      'recursive-openapi.yaml',
      '--rules',
      'schema-consistency',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'validate-recursive.txt'));
  });

  test('discards findings below --min-severity', async () => {
    const output = runDrift([
      'traffic-mixed-severity.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint,schema-consistency',
      '--min-severity',
      'error',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'validate-min-severity.txt'));
  });

  test('writes the drift report to a file with --output', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'drift-report-'));
    const outputFile = join(outputDir, 'report.json');
    try {
      const output = runDrift([
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
      await expect(output.replaceAll(outputDir, '<output-dir>')).toMatchFileSnapshot(
        join(snapshots, 'validate-output-file.txt')
      );
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
    const output = runDrift([
      'traffic.har',
      '--api',
      'openapi.yaml',
      '--traffic-format',
      'har',
      '--rules',
      'undocumented-endpoint',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'format-har.txt'));
  });

  test('parses Kong traffic', async () => {
    const output = runDrift([
      'traffic.kong.json',
      '--api',
      'openapi.yaml',
      '--traffic-format',
      'kong',
      '--rules',
      'undocumented-endpoint',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'format-kong.txt'));
  });

  test('parses Nginx JSON traffic', async () => {
    const output = runDrift([
      'nginx-access.ndjson',
      '--api',
      'openapi.yaml',
      '--traffic-format',
      'nginx-json',
      '--rules',
      'undocumented-endpoint',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'format-nginx-json.txt'));
  });

  test('parses Apache JSON traffic', async () => {
    const output = runDrift([
      'apache-access.ndjson',
      '--api',
      'openapi.yaml',
      '--traffic-format',
      'apache-json',
      '--rules',
      'undocumented-endpoint',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'format-apache-json.txt'));
  });

  test('auto-detects NDJSON traffic', async () => {
    const output = runDrift([
      'traffic-undocumented.ndjson',
      '--api',
      'openapi.yaml',
      '--traffic-format',
      'auto',
      '--rules',
      'undocumented-endpoint',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'format-auto-ndjson.txt'));
  });
});

describe('drift - output formats', () => {
  test('renders JSON output', async () => {
    const output = runDrift([
      'traffic-undocumented.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint',
      '--format',
      'json',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'output-json.txt'));
  });

  test('renders CSV output', async () => {
    const output = runDrift([
      'traffic-undocumented.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint',
      '--format',
      'csv',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'output-csv.txt'));
  });

  test('renders SARIF output', async () => {
    const output = runDrift([
      'traffic-undocumented.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint',
      '--format',
      'sarif',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'output-sarif.txt'));
  });

  test('keeps summary counts when --max-findings is 0 and hides the detail list', async () => {
    const output = runDrift([
      'traffic-undocumented.ndjson',
      '--api',
      'openapi.yaml',
      '--rules',
      'undocumented-endpoint',
      '--max-findings',
      '0',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'output-max-findings-0.txt'));
  });
});

describe('drift - coverage', () => {
  test('prints the coverage overview after the report with --coverage', async () => {
    const output = runDrift([
      'traffic-coverage.ndjson',
      '--api',
      'coverage-openapi.yaml',
      '--rules',
      'undocumented-endpoint',
      '--coverage',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'coverage-overview.txt'));
  });

  test('keeps stdout machine-readable and moves the overview to stderr with --format json', () => {
    const result = runCommandResult(
      'node',
      [
        indexEntryPoint,
        'drift',
        'traffic-coverage.ndjson',
        '--api',
        'coverage-openapi.yaml',
        '--rules',
        'undocumented-endpoint',
        '--format',
        'json',
        '--coverage',
      ],
      { testPath: fixtures }
    );
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    expect(result.stderr).toContain('API coverage');
  });

  test('writes the detailed JSON coverage report with --coverage-output', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'drift-coverage-'));
    const outputFile = join(outputDir, 'coverage.json');
    try {
      const output = runDrift([
        'traffic-coverage.ndjson',
        '--api',
        'coverage-openapi.yaml',
        '--rules',
        'undocumented-endpoint',
        '--coverage-output',
        outputFile,
      ]);
      await expect(output.replaceAll(outputDir, '<output-dir>')).toMatchFileSnapshot(
        join(snapshots, 'coverage-output-file.txt')
      );
      const report = readFileSync(outputFile, 'utf-8').replaceAll(process.cwd(), '.');
      await expect(report).toMatchFileSnapshot(join(snapshots, 'coverage-json.txt'));
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });
});

describe('drift - argument validation', () => {
  test('rejects --server combined with --match-mode', async () => {
    const output = runDrift([
      'traffic-prefixed.ndjson',
      '--api',
      'openapi.yaml',
      '--server',
      'localhost:9000',
      '--match-mode',
      'basepath',
    ]);
    await expect(output).toMatchFileSnapshot(join(snapshots, 'server-with-match-mode.txt'));
  });
});
