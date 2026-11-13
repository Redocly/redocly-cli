import { describe, it, expect } from 'vitest';

import { parseMarkdown } from '../../parser/index.js';
import { capitalization } from '../../rules/scope/capitalization.js';
import { spelling } from '../../rules/scope/spelling.js';
import type { ScopeRuleContext } from '../../rules/types.js';
import { extractScopes } from '../../scopes/extractor.js';
import type {
  NormalizedRule,
  CapitalizationAssertion,
  SpellingAssertion,
} from '../../types/index.js';
import { TECHNICAL_PROPER_NOUNS } from '../proper-nouns.js';

function buildScopedContext(
  content: string,
  scopeFilter: (scope: string) => boolean
): ScopeRuleContext {
  const tree = parseMarkdown(content);
  const segments = extractScopes(tree, content).filter((segment) => scopeFilter(segment.scope));
  return { segments, content, tree };
}

function capitalizationRule(options: CapitalizationAssertion): NormalizedRule {
  return {
    name: 'test-capitalization',
    shortName: 'capitalization',
    severity: 'error',
    message: '"%s" should use %s capitalization.',
    scope: 'heading.h1',
    assertions: { capitalization: options },
  };
}

function spellingRule(options: SpellingAssertion): NormalizedRule {
  return {
    name: 'test-spelling',
    shortName: 'spelling',
    severity: 'error',
    message: 'Unknown word "%s"%s',
    assertions: { spelling: options },
  };
}

describe('TECHNICAL_PROPER_NOUNS', () => {
  it('is alphabetized case-insensitively and duplicate-free', () => {
    const lower = TECHNICAL_PROPER_NOUNS.map((n) => n.toLowerCase());
    expect(lower).toEqual([...lower].sort());
    expect(new Set(lower).size).toBe(lower.length);
  });

  it('contains no pure ALL-CAPS entries (already handled structurally by isAllCapsWord)', () => {
    const offenders = TECHNICAL_PROPER_NOUNS.filter((n) => n.length >= 2 && n === n.toUpperCase());
    expect(offenders).toEqual([]); // e.g. 'JWT' or 'YAML' would fail here
  });

  // Uses the real dictionary instead of a hand-written list of banned words.
  it("never includes a single-word entry whose lowercase form is a real English dictionary word -- the file's stated bar -- unless explicitly accepted as a documented risk", async () => {
    const ACCEPTED_RISK_ENTRIES = new Set([
      'android', // also an ordinary noun, but rare in technical prose compared to the OS
      'curl', // also an ordinary verb, but the HTTP client is far more common in API docs
      'docker', // also an ordinary noun, but rare compared to the platform
      'typescript', // also an ordinary noun, but rare compared to the language
    ]);

    for (const noun of TECHNICAL_PROPER_NOUNS) {
      // Multi-word and dotted entries are not a single word, so skip them.
      if (/[\s.]/.test(noun)) continue;

      const lower = noun.toLowerCase();
      if (ACCEPTED_RISK_ENTRIES.has(lower)) continue;

      // Turn off the built-in vocabulary, or it would accept every entry.
      const content = `Text with ${lower} inside.\n`;
      const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');
      const rule = spellingRule({ builtinVocabulary: false });

      const problems = await spelling.execute(rule, 'test.md', ctx);

      // No problems means the dictionary accepts the word, which is what we don't want.
      expect(
        problems,
        `"${noun}"'s lowercase form "${lower}" is accepted by the real dictionary as an ` +
          `ordinary English word -- exactly the bar proper-nouns.ts's header documents ` +
          `("words with legitimate lowercase prose usage... would force-capitalize ordinary ` +
          `English"). Remove it from TECHNICAL_PROPER_NOUNS, or add it to this test's ` +
          `ACCEPTED_RISK_ENTRIES with a stated reason if the call is genuinely debatable.`
      ).not.toEqual([]);
    }
  });

  // The scope must be `heading.h1`; a bare `heading` matches no segments and the test would check
  // nothing.
  it('every entry survives capitalization $sentence unmodified', async () => {
    for (const noun of TECHNICAL_PROPER_NOUNS) {
      const content = `# Deploy with ${noun} today\n`;
      const ctx = buildScopedContext(content, (scope) => scope === 'heading.h1');
      const rule = capitalizationRule({ match: '$sentence' });

      const problems = await capitalization.execute(rule, 'test.md', ctx);

      expect(problems, `entry "${noun}" is not protected by capitalization`).toEqual([]);
    }
  });

  it('every entry is accepted by spelling', async () => {
    const content = `Text with ${TECHNICAL_PROPER_NOUNS.join(' ')} inside.\n`;
    const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');
    const rule = spellingRule({});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });
});
