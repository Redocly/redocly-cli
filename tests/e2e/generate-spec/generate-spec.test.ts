import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
const fixtures = join(__dirname, 'fixtures');
const snapshots = join(__dirname, '__snapshots__');

function runGenerateSpec(
  args: string[],
  env: Record<string, string> = {}
): { output: string; code: number | null } {
  const result = spawnSync('node', [indexEntryPoint, 'generate-spec', ...args], {
    encoding: 'utf-8',
    stdio: 'pipe',
    cwd: fixtures,
    env: { ...process.env, NODE_ENV: 'test', NO_COLOR: 'TRUE', FORCE_COLOR: '0', ...env },
  });

  if (result.error) {
    throw new Error(`Command execution failed: ${result.error.message}`);
  }

  const out = result.stdout?.toString() ?? '';
  const err = result.stderr?.toString() ?? '';
  return { output: cleanupOutput(`${out}\n${err}`), code: result.status };
}

// Prepend a stub-provider bin directory to PATH so the spawned "claude" CLI
// resolves to the fixture stub instead of a real installation.
function withStub(binDir: string): Record<string, string> {
  return { PATH: `${join(fixtures, binDir)}${delimiter}${process.env.PATH}` };
}

async function matchSnapshot(name: string, output: string): Promise<void> {
  await expect(output).toMatchFileSnapshot(join(snapshots, `${name}.txt`));
}

describe('generate-spec - deterministic inference', () => {
  test('infers an OpenAPI description from NDJSON traffic', async () => {
    const { output, code } = runGenerateSpec(['traffic.ndjson']);
    expect(code).toBe(0);
    await matchSnapshot('infer-ndjson', output);
  });

  test('templatizes identifier-like path segments into path parameters', async () => {
    const { output, code } = runGenerateSpec(['traffic-ids.ndjson']);
    expect(code).toBe(0);
    await matchSnapshot('infer-id-templates', output);
  });

  test('infers an OpenAPI description from HAR traffic', async () => {
    const { output, code } = runGenerateSpec(['traffic.har', '--traffic-format', 'har']);
    expect(code).toBe(0);
    await matchSnapshot('infer-har', output);
  });

  test('scopes traffic to --server and rebases paths onto it', async () => {
    const { output, code } = runGenerateSpec([
      'traffic-servers.ndjson',
      '--server',
      'http://api.example.com/v2',
    ]);
    expect(code).toBe(0);
    await matchSnapshot('infer-server-scoped', output);
  });

  test('uses --title for the generated description', () => {
    const { output, code } = runGenerateSpec(['traffic.ndjson', '--title', 'Custom Users API']);
    expect(code).toBe(0);
    expect(output).toContain('title: Custom Users API');
  });

  test('writes the description to a file with --output', () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'generate-spec-'));
    const outputFile = join(outputDir, 'nested', 'openapi.yaml');
    try {
      const { output, code } = runGenerateSpec(['traffic.ndjson', '--output', outputFile]);
      expect(code).toBe(0);
      expect(output).toContain('Written to:');
      expect(output).not.toContain('openapi: 3.1.0');
      const document = readFileSync(outputFile, 'utf-8');
      expect(document).toContain('openapi: 3.1.0');
      expect(document).toContain('/users/{userId}');
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });
});

describe('generate-spec - error handling', () => {
  test('fails when no traffic matches the --server', () => {
    const { output, code } = runGenerateSpec([
      'traffic.ndjson',
      '--server',
      'http://unrelated.example.com',
    ]);
    expect(code).toBe(1);
    expect(output).toContain('No HTTP exchanges in the traffic matched the server');
  });

  test('fails when the traffic path does not exist', () => {
    const { code } = runGenerateSpec(['does-not-exist.ndjson']);
    expect(code).toBe(1);
  });
});

describe('generate-spec - AI refinement', () => {
  test('uses the provider output when it returns a valid OpenAPI document', async () => {
    const { output, code } = runGenerateSpec(
      ['traffic.ndjson', '--with-ai', '--ai-provider', 'claude'],
      withStub('bin-ok')
    );
    expect(code).toBe(0);
    expect(output).toContain('AI refinement complete (claude).');
    await matchSnapshot('ai-refined', output);
  });

  test('falls back to the baseline when the provider returns a non-OpenAPI answer', () => {
    const { output, code } = runGenerateSpec(
      ['traffic.ndjson', '--with-ai', '--ai-provider', 'claude'],
      withStub('bin-bad')
    );
    expect(code).toBe(0);
    expect(output).toContain('AI refinement failed, falling back to the baseline description');
    expect(output).toContain('not a valid OpenAPI document');
    expect(output).toContain('openapi: 3.1.0');
    expect(output).toContain('/users/{userId}');
  });

  test('falls back to the baseline when the provider CLI exits with an error', () => {
    const { output, code } = runGenerateSpec(
      ['traffic.ndjson', '--with-ai', '--ai-provider', 'claude'],
      withStub('bin-fail')
    );
    expect(code).toBe(0);
    expect(output).toContain('claude CLI exited with code 7');
    expect(output).toContain('openapi: 3.1.0');
  });

  test('falls back to the baseline when the provider CLI is not installed', () => {
    const { output, code } = runGenerateSpec(
      ['traffic.ndjson', '--with-ai', '--ai-provider', 'claude'],
      // Restrict PATH to the node binary directory so "claude" cannot resolve.
      { PATH: dirname(process.execPath) }
    );
    expect(code).toBe(0);
    expect(output).toContain('Could not find the "claude" CLI on PATH');
    expect(output).toContain('openapi: 3.1.0');
  });

  test('falls back to the baseline when the openai provider is not configured', () => {
    const { output, code } = runGenerateSpec(
      ['traffic.ndjson', '--with-ai', '--ai-provider', 'openai'],
      { OPENAI_ENDPOINT: '', OPENAI_API_KEY: '' }
    );
    expect(code).toBe(0);
    expect(output).toContain('Set OPENAI_ENDPOINT');
    expect(output).toContain('openapi: 3.1.0');
  });
});
