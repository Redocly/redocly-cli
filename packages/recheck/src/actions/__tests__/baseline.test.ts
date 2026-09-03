import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

import { resolveRecheckConfig, type ResolvedRecheckConfig } from '../../config/resolve.js';
import { generateBaseline } from '../baseline.js';
import { collectingLogger } from '../logger.js';

/** Builds a resolved config from block/extends data, the same shape a recheck.yaml
 *  root key would carry, without writing anything to disk. */
async function resolveConfig(
  configDir: string,
  block: Record<string, unknown> = {},
  extendsList?: string[]
): Promise<ResolvedRecheckConfig> {
  const result = await resolveRecheckConfig({ extends: extendsList, block, configDir });
  if (!result.success) {
    throw new Error(
      `config resolution failed: ${result.errors.map((error) => error.message).join('; ')}`
    );
  }
  return result.config;
}

describe('generateBaseline', () => {
  it('includes embedded API description findings, keyed by the API file', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-baseline-embedded-'));
    const config = await resolveConfig(dir, {}, ['recheck/markdown']);
    const logger = collectingLogger();
    // A single unbroken run of characters cannot exceed `recheck/line-length`
    // (markdownlint's own MD013 stern/strict rule collapses it), so the
    // fixture repeats separate words instead.
    const longLine = 'lorem ipsum dolor sit amet '.repeat(6).trim();
    const apiFile = path.join(dir, 'openapi.yaml');

    const exitCode = await generateBaseline([], config, logger, {
      embeddedInputs: [
        {
          file: apiFile,
          pointer: '#/info/description',
          content: `${longLine}\n`,
          mapPosition: (line, column) => ({ line, column }),
        },
      ],
    });
    expect(exitCode).toBe(0);

    const baselineText = await fs.readFile(path.join(dir, 'recheck-baseline.yaml'), 'utf8');
    const baseline = yaml.load(baselineText) as { files: Record<string, Record<string, number>> };
    const key = path.relative(dir, apiFile).split(path.sep).join('/');
    expect(baseline.files[key]).toEqual({ 'recheck/line-length': 1 });
  });
});
