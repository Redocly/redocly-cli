import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TIME_KEYS = new Set(['startTime', 'endTime', 'totalTimeMs', 'totalTime', 'time']);

// Times change on every run, and the live Cafe API owns its response headers,
// so the snapshot keeps only the content type of a response.
function replaceUnstableValues(key: string, value: unknown) {
  if (TIME_KEYS.has(key)) {
    return '<time>';
  }
  if (key === 'response') {
    const response = value as { headers: Record<string, string> };
    return { ...response, headers: { 'content-type': response.headers['content-type'] } };
  }
  return value;
}

test('should write the results of the run to the --json-output file', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const outputDir = mkdtempSync(join(tmpdir(), 'respect-json-output-'));
  const jsonOutputPath = join(outputDir, 'logs.json');

  try {
    const args = getParams(indexEntryPoint, [
      'respect',
      'json-output.arazzo.yaml',
      '--json-output',
      jsonOutputPath,
    ]);
    getCommandOutput(args, { testPath: __dirname });

    const jsonLogs = JSON.parse(readFileSync(jsonOutputPath, 'utf-8'));
    expect(JSON.stringify(jsonLogs, replaceUnstableValues, 2)).toMatchSnapshot();
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
}, 60_000);
