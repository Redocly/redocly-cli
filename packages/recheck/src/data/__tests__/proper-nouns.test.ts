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

// Same recipe as every other scope-rule test (src/rules/CONTRIBUTING.md's
// "Testing" section, also used by capitalization.test.ts/spelling.test.ts):
// build a ScopeRuleContext directly from parseMarkdown + extractScopes,
// filtered to the scope(s) under test.
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

  // Ordinary Title-Case names ('Redocly', 'Docker') qualify: $sentence
  // lowercases every non-first word regardless of how ordinary it looks.
  it('contains no pure ALL-CAPS entries (already handled structurally by isAllCapsWord)', () => {
    const offenders = TECHNICAL_PROPER_NOUNS.filter((n) => n.length >= 2 && n === n.toUpperCase());
    expect(offenders).toEqual([]); // e.g. 'JWT' or 'YAML' would fail here
  });

  // Asks the REAL dictionary rather than a hand-written denylist, so a
  // future entry that doubles as an ordinary word is caught without anyone
  // having thought of that specific word first. A denylist here previously
  // passed while seven such entries shipped.
  it("never includes a single-word entry whose lowercase form is a real English dictionary word -- the file's stated bar -- unless explicitly accepted as a documented risk", async () => {
    const ACCEPTED_RISK_ENTRIES = new Set([
      'android', // ordinary noun ("a humanoid robot"); rare in technical prose relative to the OS -- final-review audit, kept
      'curl', // ordinary verb/noun ("curl the wire", "a curl of hair"); rare in technical prose relative to the HTTP client, which appears constantly in API docs. Note this entry's risk runs the OTHER way from its neighbours here: its as-written form is lowercase, so a false hit force-LOWERCASES an ordinary capitalized 'Curl' rather than capitalizing a lowercase word. Project-owner request, 2026-08-10
      'docker', // ordinary noun ("a dockworker", chiefly British/historical); rare relative to the platform -- final-review audit, kept
      'typescript', // ordinary noun ("a typed manuscript", archaic); rare relative to the language, and central to this codebase -- final-review audit, kept
    ]);

    for (const noun of TECHNICAL_PROPER_NOUNS) {
      // Multi-word/dotted entries are never one token, so they can't collide.
      if (/[\s.]/.test(noun)) continue;

      const lower = noun.toLowerCase();
      if (ACCEPTED_RISK_ENTRIES.has(lower)) continue;

      // Must ask the BARE dictionary; recheck's own vocabulary would
      // trivially accept every entry.
      const content = `Text with ${lower} inside.\n`;
      const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');
      const rule = spellingRule({ builtinVocabulary: false });

      const problems = await spelling.execute(rule, 'test.md', ctx);

      // Empty problems means the dictionary accepted it -- the
      // disqualifying condition. A non-word gets flagged "unknown" instead.
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

  // Catches a dead entry -- one that looks like protection but can never
  // match. Scope must be `heading.h1`, not a bare `heading`: that extracts
  // zero segments and would pass while testing nothing.
  it('every entry survives capitalization $sentence unmodified', async () => {
    for (const noun of TECHNICAL_PROPER_NOUNS) {
      const content = `# Deploy with ${noun} today\n`;
      const ctx = buildScopedContext(content, (scope) => scope === 'heading.h1');
      const rule = capitalizationRule({ match: '$sentence' });

      const problems = await capitalization.execute(rule, 'test.md', ctx);

      expect(problems, `entry "${noun}" is not protected by capitalization`).toEqual([]);
    }
  });

  // Cannot pass vacuously: a missing speller rethrows rather than failing
  // closed, so a real one must have run for this to report zero.
  it('every entry is accepted by spelling', async () => {
    const content = `Text with ${TECHNICAL_PROPER_NOUNS.join(' ')} inside.\n`;
    const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');
    const rule = spellingRule({});

    const problems = await spelling.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });
});
