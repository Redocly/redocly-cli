import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanupOutput, getCommandOutput, getParams } from '../helpers.js';

const diffDir = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

/** Every fixture is a `base.yaml`/`revision.yaml` pair in its own folder under this one. */
export function fixturePath(fixture: string): string {
  return join(diffDir, fixture);
}

export function runDiff(fixture: string, ...args: string[]): string {
  const params = getParams(indexEntryPoint, ['diff', 'base.yaml', 'revision.yaml', ...args]);
  return cleanupOutput(getCommandOutput(params, { testPath: fixturePath(fixture) }));
}

/**
 * The `json` report, parsed. The command prints its timing line to stderr as well, so
 * the document is cut out of the captured output.
 */
export function runJsonDiff(fixture: string): {
  summary: { major: number; minor: number; patch: number };
  bump?: 'patch' | 'minor' | 'major';
  changes: {
    key: string;
    property?: string;
    kind: string;
    impact: string;
    verdicts: { ruleId: string; impact: string; message: string }[];
  }[];
} {
  const output = runDiff(fixture, '--format=json');
  return JSON.parse(output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1));
}
