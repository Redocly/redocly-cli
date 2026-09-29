// Config validation: unknown names and stale pattern warnings.
import { describe, it, expect } from 'vitest';

import { validate } from '../../../config/validate.js';

describe('config validation of unknown names', () => {
  it('rejects an unknown assertion id, naming it', async () => {
    const result = await validate({
      'recheck/test-rule': {
        severity: 'error' as const,
        message: 'Test message',
        assertions: { 'no-such-assertion': {} },
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('Unknown assertion type "no-such-assertion"'),
      })
    );
  });

  it('rejects an unknown rule key with an error naming it', async () => {
    const result = await validate({
      'recheck/test-rule': {
        severity: 'error' as const,
        message: 'Test message',
        autoFixable: true,
        assertions: { pattern: { tokens: ['x'] } },
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('autoFixable'),
      })
    );
  });
});

describe('config validate() — stale pattern warning', () => {
  it('warns when a non-raw/non-all scoped pattern token starts with the literal "^#"', async () => {
    const warnings: string[] = [];
    const config = {
      'recheck/test-rule': {
        severity: 'error' as const,
        message: 'Test message',
        scope: 'heading',
        assertions: { pattern: { tokens: ['^#+ \\w*ing'] } },
      },
    };

    await validate(config, { warn: (message) => warnings.push(message) });

    expect(warnings.some((message) => message.includes("starts with '^#'"))).toBe(true);
    expect(warnings.some((message) => message.includes('scope "heading"'))).toBe(true);
  });

  it('does NOT warn for the same token when scope is "raw"', async () => {
    const warnings: string[] = [];
    const config = {
      'recheck/test-rule': {
        severity: 'error' as const,
        message: 'Test message',
        scope: 'raw',
        assertions: { pattern: { tokens: ['^#+ \\w*ing'] } },
      },
    };

    await validate(config, { warn: (message) => warnings.push(message) });

    const staleWarnings = warnings.filter((message) => message.includes('^#'));
    expect(staleWarnings).toEqual([]);
  });

  it('does NOT warn when scope is "all" (the default)', async () => {
    const warnings: string[] = [];
    const config = {
      'recheck/test-rule': {
        severity: 'error' as const,
        message: 'Test message',
        assertions: { pattern: { tokens: ['^#+ \\w*ing'] } },
      },
    };

    await validate(config, { warn: (message) => warnings.push(message) });

    const staleWarnings = warnings.filter((message) => message.includes('^#'));
    expect(staleWarnings).toEqual([]);
  });

  it('does NOT warn for a pattern token that does not start with "^#"', async () => {
    const warnings: string[] = [];
    const config = {
      'recheck/test-rule': {
        severity: 'error' as const,
        message: 'Test message',
        scope: 'heading',
        assertions: { pattern: { tokens: ['^\\w*ing\\b'] } },
      },
    };

    await validate(config, { warn: (message) => warnings.push(message) });

    const staleWarnings = warnings.filter((message) => message.includes('^#'));
    expect(staleWarnings).toEqual([]);
  });

  it('checks every array entry when scope is an array, warning per offending term', async () => {
    const warnings: string[] = [];
    const config = {
      'recheck/test-rule': {
        severity: 'error' as const,
        message: 'Test message',
        scope: ['heading.h1', 'heading.h2'],
        assertions: { pattern: { tokens: ['^# heading'] } },
      },
    };

    await validate(config, { warn: (message) => warnings.push(message) });

    expect(warnings.some((message) => message.includes("starts with '^#'"))).toBe(true);
  });
});
