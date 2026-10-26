import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanupOutput, getCommandOutput, getParams } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
const fixtures = join(__dirname, 'fixtures');
const snapshots = join(__dirname, '__snapshots__');

// Per-operation progress lines and the closing summary report wall-clock
// durations; normalize them.
function cleanupGenerateSpec(output: string): string {
  return cleanupOutput(output)
    .replace(/\(\d+s\)/g, '(<t>s)')
    .replace(/Done in (?:\d+m )?\d+s\./g, 'Done in <t>.');
}

// Prepend a stub-provider bin directory to PATH so the spawned "claude" CLI
// resolves to the fixture stub instead of a real installation.
function withStub(binDir: string): Record<string, string> {
  return { PATH: `${join(fixtures, binDir)}${delimiter}${process.env.PATH}` };
}

describe('generate-spec - deterministic inference', () => {
  test('infers an OpenAPI description from NDJSON traffic', async () => {
    const args = getParams(indexEntryPoint, ['generate-spec', 'traffic.ndjson']);
    const output = cleanupGenerateSpec(getCommandOutput(args, { testPath: fixtures }));
    await expect(output).toMatchFileSnapshot(join(snapshots, 'infer-ndjson.txt'));
  });

  test('templatizes identifier-like path segments into path parameters', async () => {
    const args = getParams(indexEntryPoint, ['generate-spec', 'traffic-ids.ndjson']);
    const output = cleanupGenerateSpec(getCommandOutput(args, { testPath: fixtures }));
    await expect(output).toMatchFileSnapshot(join(snapshots, 'infer-id-templates.txt'));
  });

  test('infers an OpenAPI description from HAR traffic', async () => {
    const args = getParams(indexEntryPoint, [
      'generate-spec',
      'traffic.har',
      '--traffic-format',
      'har',
    ]);
    const output = cleanupGenerateSpec(getCommandOutput(args, { testPath: fixtures }));
    await expect(output).toMatchFileSnapshot(join(snapshots, 'infer-har.txt'));
  });

  test('describes alternative body shapes with oneOf and nullable type unions', async () => {
    const args = getParams(indexEntryPoint, ['generate-spec', 'traffic-polymorphic.ndjson']);
    const output = cleanupGenerateSpec(getCommandOutput(args, { testPath: fixtures }));
    await expect(output).toMatchFileSnapshot(join(snapshots, 'infer-polymorphic.txt'));
  });

  test('scopes traffic to --server and rebases paths onto it', async () => {
    const args = getParams(indexEntryPoint, [
      'generate-spec',
      'traffic-servers.ndjson',
      '--server',
      'http://api.example.com/v2',
    ]);
    const output = cleanupGenerateSpec(getCommandOutput(args, { testPath: fixtures }));
    await expect(output).toMatchFileSnapshot(join(snapshots, 'infer-server-scoped.txt'));
  });

  test('uses --title for the generated description', async () => {
    const args = getParams(indexEntryPoint, [
      'generate-spec',
      'traffic.ndjson',
      '--title',
      'Custom Users API',
    ]);
    const output = cleanupGenerateSpec(getCommandOutput(args, { testPath: fixtures }));
    await expect(output).toMatchFileSnapshot(join(snapshots, 'infer-title.txt'));
  });

  test('generates OpenAPI 3.1 with --openapi-version and skips the QUERY method', async () => {
    const args = getParams(indexEntryPoint, [
      'generate-spec',
      'traffic-query.ndjson',
      '--openapi-version',
      '3.1',
    ]);
    const output = cleanupGenerateSpec(getCommandOutput(args, { testPath: fixtures }));
    await expect(output).toMatchFileSnapshot(join(snapshots, 'infer-openapi-3-1.txt'));
  });

  test('describes the QUERY method in OpenAPI 3.2', async () => {
    const args = getParams(indexEntryPoint, ['generate-spec', 'traffic-query.ndjson']);
    const output = cleanupGenerateSpec(getCommandOutput(args, { testPath: fixtures }));
    await expect(output).toMatchFileSnapshot(join(snapshots, 'infer-query-method.txt'));
  });

  test('writes the description to a file with --output', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'generate-spec-'));
    const outputFile = join(outputDir, 'nested', 'openapi.yaml');
    try {
      const args = getParams(indexEntryPoint, [
        'generate-spec',
        'traffic.ndjson',
        '--output',
        outputFile,
      ]);
      const output = cleanupGenerateSpec(getCommandOutput(args, { testPath: fixtures }));
      await expect(output.replaceAll(outputDir, '<output-dir>')).toMatchFileSnapshot(
        join(snapshots, 'output-file.txt')
      );
      const document = readFileSync(outputFile, 'utf-8');
      expect(document).toContain('openapi: 3.2.0');
      expect(document).toContain('/users/{userId}');
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });
});

describe('generate-spec - error handling', () => {
  test('fails when no traffic matches the --server', async () => {
    const args = getParams(indexEntryPoint, [
      'generate-spec',
      'traffic.ndjson',
      '--server',
      'http://unrelated.example.com',
    ]);
    const output = cleanupGenerateSpec(getCommandOutput(args, { testPath: fixtures }));
    await expect(output).toMatchFileSnapshot(join(snapshots, 'error-server-mismatch.txt'));
  });

  test('fails when --openapi-version 3.1 skips every QUERY exchange', async () => {
    const args = getParams(indexEntryPoint, [
      'generate-spec',
      'traffic-query-only.ndjson',
      '--openapi-version',
      '3.1',
    ]);
    const output = cleanupGenerateSpec(getCommandOutput(args, { testPath: fixtures }));
    await expect(output).toMatchFileSnapshot(join(snapshots, 'error-query-only.txt'));
  });

  test('fails when the traffic path does not exist', async () => {
    const args = getParams(indexEntryPoint, ['generate-spec', 'does-not-exist.ndjson']);
    const output = cleanupGenerateSpec(getCommandOutput(args, { testPath: fixtures }));
    await expect(output).toMatchFileSnapshot(join(snapshots, 'error-missing-traffic.txt'));
  });
});

describe('generate-spec - AI refinement', () => {
  test('refines every operation with the provider fragments', async () => {
    // Sequential refinement keeps the per-operation progress lines in a
    // deterministic order for the snapshot.
    const args = getParams(indexEntryPoint, [
      'generate-spec',
      'traffic.ndjson',
      '--with-ai',
      '--ai-provider',
      'claude',
      '--ai-concurrency',
      '1',
    ]);
    const output = cleanupGenerateSpec(
      getCommandOutput(args, { testPath: fixtures, env: withStub('bin-ok') })
    );
    await expect(output).toMatchFileSnapshot(join(snapshots, 'ai-refined.txt'));
  });

  test('accepts refined operations that use oneOf, allOf and discriminator', async () => {
    const args = getParams(indexEntryPoint, [
      'generate-spec',
      'traffic-polymorphic.ndjson',
      '--with-ai',
      '--ai-provider',
      'claude',
      '--ai-concurrency',
      '1',
    ]);
    const output = cleanupGenerateSpec(
      getCommandOutput(args, { testPath: fixtures, env: withStub('bin-ok-polymorphic') })
    );
    await expect(output).toMatchFileSnapshot(join(snapshots, 'ai-refined-polymorphic.txt'));
  });

  test('runs the Cursor CLI when the cursor provider is selected', async () => {
    const args = getParams(indexEntryPoint, [
      'generate-spec',
      'traffic.ndjson',
      '--with-ai',
      '--ai-provider',
      'cursor',
      '--ai-concurrency',
      '1',
    ]);
    const output = cleanupGenerateSpec(
      getCommandOutput(args, { testPath: fixtures, env: withStub('bin-ok') })
    );
    await expect(output).toMatchFileSnapshot(join(snapshots, 'ai-refined-cursor.txt'));
  });

  test('keeps the baseline for operations the provider does not refine', async () => {
    const args = getParams(indexEntryPoint, [
      'generate-spec',
      'traffic.ndjson',
      '--with-ai',
      '--ai-provider',
      'claude',
      '--ai-concurrency',
      '1',
    ]);
    const output = cleanupGenerateSpec(
      getCommandOutput(args, { testPath: fixtures, env: withStub('bin-partial') })
    );
    await expect(output).toMatchFileSnapshot(join(snapshots, 'ai-partial.txt'));
  });

  test('falls back to the baseline when the provider returns a non-YAML answer', async () => {
    const args = getParams(indexEntryPoint, [
      'generate-spec',
      'traffic.ndjson',
      '--with-ai',
      '--ai-provider',
      'claude',
      '--ai-concurrency',
      '1',
    ]);
    const output = cleanupGenerateSpec(
      getCommandOutput(args, { testPath: fixtures, env: withStub('bin-bad') })
    );
    await expect(output).toMatchFileSnapshot(join(snapshots, 'ai-bad-answer.txt'));
  });

  test('falls back to the baseline when the provider CLI exits with an error', async () => {
    const args = getParams(indexEntryPoint, [
      'generate-spec',
      'traffic.ndjson',
      '--with-ai',
      '--ai-provider',
      'claude',
      '--ai-concurrency',
      '1',
    ]);
    const output = cleanupGenerateSpec(
      getCommandOutput(args, { testPath: fixtures, env: withStub('bin-fail') })
    );
    await expect(output).toMatchFileSnapshot(join(snapshots, 'ai-provider-error.txt'));
  });

  test('falls back to the baseline when the provider CLI is not installed', async () => {
    const args = getParams(indexEntryPoint, [
      'generate-spec',
      'traffic.ndjson',
      '--with-ai',
      '--ai-provider',
      'claude',
      '--ai-concurrency',
      '1',
    ]);
    // Restrict PATH to the node binary directory so "claude" cannot resolve.
    const output = cleanupGenerateSpec(
      getCommandOutput(args, { testPath: fixtures, env: { PATH: dirname(process.execPath) } })
    );
    await expect(output).toMatchFileSnapshot(join(snapshots, 'ai-provider-missing.txt'));
  });
});
