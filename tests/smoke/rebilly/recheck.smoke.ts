import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

import { getCommandOutput, getParams } from '../../e2e/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('recheck lints the Rebilly description', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const args = getParams(indexEntryPoint, [
    'recheck',
    join(__dirname, 'rebilly-description.yaml'),
    '--format=json',
  ]);
  const result = getCommandOutput(args);
  const [stdout, stderr] = result.split('\n\n');
  const report = JSON.parse(stdout);
  expect(report.summary.filesScanned).toBeGreaterThan(0);
  expect(Array.isArray(report.issues)).toBe(true);
  expect(stderr).toContain('API description(s)');
}, 300_000);
