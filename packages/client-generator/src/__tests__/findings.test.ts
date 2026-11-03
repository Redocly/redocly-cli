import { logger } from '@redocly/openapi-core';

import { reportFinding } from '../findings.js';
import type { GenerateClientFinding } from '../types.js';

describe('reportFinding', () => {
  beforeEach(() => {
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  it('explains the finding shape for a value that is not JSON', () => {
    const finding: Record<string, unknown> = { kind: 'operation-skipped' };
    finding.self = finding;

    expect(() => reportFinding(finding as unknown as GenerateClientFinding)).toThrow(
      'a finding is { kind, message, operations }'
    );
  });
});
