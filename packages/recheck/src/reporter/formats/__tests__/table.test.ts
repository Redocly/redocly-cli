import { describe, expect, it } from 'vitest';

import { collectingLogger } from '../../../actions/logger.js';
import type { Problem } from '../../../types/index.js';
import { outputTableFormat } from '../table.js';

function problem(overrides: Partial<Problem> = {}): Problem {
  return {
    file: 'openapi.yaml',
    line: 1,
    column: 1,
    text: '',
    match: '',
    ruleName: 'recheck/line-length',
    severity: 'error',
    message: 'Line too long.',
    ...overrides,
  };
}

describe('outputTableFormat', () => {
  it('marks a fixable page finding with [fixable]', () => {
    const logger = collectingLogger();

    outputTableFormat([problem({ fixable: true })], 1, false, logger);

    expect(logger.outputs.join('\n')).toContain('[fixable]');
  });

  it('does not mark a fixable description finding, since --fix cannot rewrite it', () => {
    const logger = collectingLogger();

    outputTableFormat(
      [problem({ fixable: true, pointer: '#/info/description' })],
      1,
      false,
      logger
    );

    expect(logger.outputs.join('\n')).not.toContain('[fixable]');
  });
});
