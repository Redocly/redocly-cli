// PR #24801 removed the pre-parity native rules' deprecated compatibility
// layer entirely: the 4 legacy assertion ids (`max-line-length`,
// `bullet-style`, `no-duplicate-headings`, `no-broken-fragment-links`), the
// `translateLegacyOptions` option-translation layer that used to accept
// their old camelCase option names, the deprecation warnings, and the
// deprecated `autoFixable` config key. This file used to prove old-id +
// old-options equivalence with new-id + translated-options (see git
// history for that version) — those rules stopped existing, so the tests
// below prove the removal instead: each old id/key now fails config
// validation with a plain, actionable error rather than silently working
// or warning.
//
// `single-h1`/`first-line-h1` keep their upstream markdownlint synonym
// aliases (`single-title`/`first-line-heading`) permanently and
// warning-free — those are parity surface, not part of this deprecation,
// and are covered by each rule's own test file, not here.
import { describe, it, expect, vi, afterEach } from 'vitest';

import { validate } from '../../../config/validate.js';

describe('removed legacy assertion ids fail validation (PR #24801)', () => {
  function ruleWith(assertionId: string, options: Record<string, unknown> = {}) {
    return {
      'recheck/test-rule': {
        severity: 'error' as const,
        message: 'Test message',
        assertions: { [assertionId]: options },
      },
    };
  }

  // One test covering the whole class of removed ids, not one per rule —
  // each used to be a deprecated alias for a markdownlint-parity token
  // rule; all four now behave identically to any other unrecognized
  // assertion id.
  it.each([
    ['max-line-length', { maxLength: 80 }],
    ['bullet-style', { style: '-' }],
    ['no-duplicate-headings', {}],
    ['no-broken-fragment-links', {}],
  ])('"%s" is no longer a recognized assertion id', async (assertionId, options) => {
    const result = await validate(ruleWith(assertionId, options));

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining(`unknown assertion type "${assertionId}"`),
      })
    );
  });
});

describe('removed "autoFixable" config key fails validation (PR #24801)', () => {
  it('a rule setting "autoFixable" fails with an unknown-property error naming it', async () => {
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

// Start-clean cleanup (recheck cleanup pass): `enabled` was schema-legal but
// inert in the engine (filterEnabledRules only ever checks `severity`) while
// the parity translator DID honor it — a semantic mismatch between what the
// schema accepted and what actually ran. Removed the same way `autoFixable`
// was: an unknown-property error naming it, rather than silently doing
// nothing (or, worse, only affecting parity comparisons).
describe('removed "enabled" config key fails validation', () => {
  it('a rule setting "enabled" fails with an unknown-property error naming it', async () => {
    const result = await validate({
      'recheck/test-rule': {
        severity: 'error' as const,
        message: 'Test message',
        enabled: false,
        assertions: { pattern: { tokens: ['x'] } },
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('enabled'),
      })
    );
  });
});

describe('config validate() — stale pattern warning', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('warns when a non-raw/non-all scoped pattern token starts with the literal "^#"', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const config = {
      'recheck/test-rule': {
        severity: 'error' as const,
        message: 'Test message',
        scope: 'heading',
        assertions: { pattern: { tokens: ['^#+ \\w*ing'] } },
      },
    };

    await validate(config);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("starts with '^#'"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('scope "heading"'));
  });

  it('does NOT warn for the same token when scope is "raw"', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const config = {
      'recheck/test-rule': {
        severity: 'error' as const,
        message: 'Test message',
        scope: 'raw',
        assertions: { pattern: { tokens: ['^#+ \\w*ing'] } },
      },
    };

    await validate(config);

    const staleWarnings = warnSpy.mock.calls.filter((args) => String(args[0]).includes('^#'));
    expect(staleWarnings).toEqual([]);
  });

  it('does NOT warn when scope is "all" (the default)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const config = {
      'recheck/test-rule': {
        severity: 'error' as const,
        message: 'Test message',
        assertions: { pattern: { tokens: ['^#+ \\w*ing'] } },
      },
    };

    await validate(config);

    const staleWarnings = warnSpy.mock.calls.filter((args) => String(args[0]).includes('^#'));
    expect(staleWarnings).toEqual([]);
  });

  it('does NOT warn for a pattern token that does not start with "^#"', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const config = {
      'recheck/test-rule': {
        severity: 'error' as const,
        message: 'Test message',
        scope: 'heading',
        assertions: { pattern: { tokens: ['^\\w*ing\\b'] } },
      },
    };

    await validate(config);

    const staleWarnings = warnSpy.mock.calls.filter((args) => String(args[0]).includes('^#'));
    expect(staleWarnings).toEqual([]);
  });

  it('checks every array entry when scope is an array, warning per offending term', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const config = {
      'recheck/test-rule': {
        severity: 'error' as const,
        message: 'Test message',
        scope: ['heading.h1', 'heading.h2'],
        assertions: { pattern: { tokens: ['^# heading'] } },
      },
    };

    await validate(config);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("starts with '^#'"));
  });
});
