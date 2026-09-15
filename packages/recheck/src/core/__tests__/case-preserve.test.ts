import { describe, it, expect } from 'vitest';

import { applyMatchCase } from '../case-preserve.js';

describe('applyMatchCase', () => {
  it('leaves an all-lowercase match alone', () => {
    expect(applyMatchCase('behaviour', 'behavior')).toBe('behavior');
  });
  it('capitalizes when the match is capitalized', () => {
    expect(applyMatchCase('Behaviour', 'behavior')).toBe('Behavior');
  });
  it('uppercases when the match is ALL-CAPS (2+ chars)', () => {
    expect(applyMatchCase('BEHAVIOUR', 'behavior')).toBe('BEHAVIOR');
  });
  it('capitalizes only the first word of a multi-word replacement', () => {
    expect(applyMatchCase('Login', 'log in')).toBe('Log in');
  });
  it('treats a single-character match as not ALL-CAPS', () => {
    expect(applyMatchCase('A', 'an')).toBe('An');
  });
  it('leaves mixed-case matches untouched (no confident inference)', () => {
    expect(applyMatchCase('bEhAvIoUr', 'behavior')).toBe('behavior');
  });

  // `applyMatchCase` shouting multi-word replacements is a real hazard
  // across presets (`GCP` -> `GOOGLE CLOUD`, `AKA`/`VICE VERSA`/`C/O`),
  // always via this same helper -- pinned directly here.
  describe('multi-word replacements are not shouted', () => {
    it('all-caps match + multi-word replacement: left as authored, not shouted', () => {
      expect(applyMatchCase('AKA', 'also known as')).toBe('also known as');
      expect(applyMatchCase('VICE VERSA', 'the other way around')).toBe('the other way around');
      expect(applyMatchCase('C/O', 'care of')).toBe('care of');
      expect(applyMatchCase('GCP', 'Google Cloud')).toBe('Google Cloud');
    });

    it('all-caps match + single-word replacement: unchanged (the case the branch exists for)', () => {
      expect(applyMatchCase('WHITELIST', 'allowlist')).toBe('ALLOWLIST');
    });

    it('capitalized match + multi-word replacement: still capitalizes only the first word', () => {
      expect(applyMatchCase('Aka', 'also known as')).toBe('Also known as');
    });

    it('lower-case match + multi-word replacement: inserted as configured', () => {
      expect(applyMatchCase('aka', 'also known as')).toBe('also known as');
    });
  });
});
