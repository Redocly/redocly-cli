import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
const fixtures = join(__dirname, 'fixtures');
const snapshots = join(__dirname, '__snapshots__');

function runCoverage(args: string[]): { output: string; code: number | null } {
  const result = spawnSync('node', [indexEntryPoint, 'coverage', ...args], {
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

  return { output: cleanupOutput(`${out}\n${err}`), code: result.status };
}

async function matchSnapshot(name: string, output: string): Promise<void> {
  await expect(output).toMatchFileSnapshot(join(snapshots, `${name}.txt`));
}

describe('E2E coverage', () => {
  it('reports operations, properties, variants, and schemas nothing reached', async () => {
    const { output, code } = runCoverage(['traffic.har', '--api', 'openapi.yaml']);

    expect(code).toBe(0);
    await matchSnapshot('coverage-stylish', output);
  });

  it('lists what it collapses when --all is passed', async () => {
    const { output, code } = runCoverage(['traffic.har', '--api', 'openapi.yaml', '--all']);

    expect(code).toBe(0);
    await matchSnapshot('coverage-all', output);
  });

  it('emits a machine-readable report with --format json', async () => {
    const { output, code } = runCoverage([
      'traffic.har',
      '--api',
      'openapi.yaml',
      '--format',
      'json',
    ]);

    expect(code).toBe(0);
    await matchSnapshot('coverage-json', output);
  });

  it('narrows to a single schema with --schema', async () => {
    const { output, code } = runCoverage([
      'traffic.har',
      '--api',
      'openapi.yaml',
      '--schema',
      'User',
    ]);

    expect(code).toBe(0);
    await matchSnapshot('coverage-schema-filter', output);
  });

  // Not snapshotted: the stack trace names minified chunks, which change on
  // every build. `drift` reports a missing traffic path the same way.
  it('fails when the traffic path does not exist', () => {
    const { output, code } = runCoverage(['absent.har', '--api', 'openapi.yaml']);

    expect(code).toBe(1);
    expect(output).toContain("ENOENT: no such file or directory, stat 'absent.har'");
  });
});
