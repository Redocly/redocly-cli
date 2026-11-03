import { logger } from '@redocly/openapi-core';

import { findingListener, reportFinding } from '../findings.js';
import type { GenerateClientFinding } from '../types.js';

describe('reportFinding', () => {
  beforeEach(() => {
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  it('gives the listener its own copy of the operations', () => {
    const received: GenerateClientFinding[] = [];
    const operations = ['listOrders'];
    findingListener.run(
      (finding) => received.push(finding),
      () => reportFinding({ kind: 'operation-skipped', message: 'skipped', operations })
    );
    operations.push('createOrder');

    expect(received).toEqual([
      { kind: 'operation-skipped', message: 'skipped', operations: ['listOrders'] },
    ]);
  });

  it('explains the finding shape for a value that is not JSON', () => {
    const finding: Record<string, unknown> = { kind: 'operation-skipped' };
    finding.self = finding;

    expect(() => reportFinding(finding as unknown as GenerateClientFinding)).toThrow(
      'a finding is { kind, message, operations }'
    );
  });
});
