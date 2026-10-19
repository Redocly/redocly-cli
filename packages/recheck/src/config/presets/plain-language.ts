import type { BaseRule, RecheckRules } from '../../types/index.js';

/**
 * `recheck/plain-language`: rules based on the US federal plain-language
 * guidance on digital.gov. It can be added on top of `recheck/google`,
 * `recheck/microsoft` or `recheck/prose`.
 *
 * Sources and the list of rules left out are in
 * packages/recheck/presets/plain-language/PROVENANCE.md. In short:
 * - No readability score, sentence length or nominalization rule, because the
 *   guidance gives no numbers for them or they would flag correct prose.
 * - No `shall`, `implement` or `command`, because they are normal words in
 *   specs and API docs.
 * - No `in order to` or `utilize`, because the Google and Microsoft presets
 *   already flag them.
 *
 * All rules only report and never auto-fix.
 */

const CLEAR_SHORT = 'https://digital.gov/guides/plain-language/writing/clear-short';
const STYLE_PAGE = 'https://digital.gov/guides/plain-language/writing/style';
const FAMILIAR_TERMS = 'https://digital.gov/guides/writing-understanding/familiar-terms';
const SHORT_SIMPLE = 'https://digital.gov/guides/plain-language/principles/short-simple';
const AVOID_JARGON = 'https://digital.gov/guides/plain-language/principles/avoid-jargon';

// Small builders, same as in google.ts and microsoft.ts.

function swapRule(opts: {
  pairs: Record<string, string>;
  message: string;
  link: string;
  scope?: string | string[];
  ignoreCase?: boolean;
  wordBoundary?: boolean;
}): BaseRule {
  return {
    severity: 'warn',
    scope: opts.scope ?? 'summary',
    link: opts.link,
    message: opts.message,
    assertions: {
      swap: {
        pairs: opts.pairs,
        ignoreCase: opts.ignoreCase,
        wordBoundary: opts.wordBoundary,
      },
    },
  };
}

function patternRule(opts: {
  tokens: string[];
  message: string;
  link: string;
  scope?: string | string[];
  ignoreCase?: boolean;
}): BaseRule {
  return {
    severity: 'warn',
    scope: opts.scope ?? 'summary',
    link: opts.link,
    message: opts.message,
    assertions: {
      pattern: {
        tokens: opts.tokens,
        ignoreCase: opts.ignoreCase,
      },
    },
  };
}

export function buildPlainLanguagePreset(): RecheckRules {
  const rules: RecheckRules = {};

  // The guide says paragraphs should never be longer than 250 words, so this is an error.
  rules['plain-language/paragraph-max-words'] = {
    severity: 'error',
    scope: 'paragraph',
    link: CLEAR_SHORT,
    message:
      'Paragraph is %s %s long; federal plain-language guidance says paragraphs should never exceed 250 words (max %s).',
    assertions: { length: { unit: 'words', max: 250 } },
  };

  // The guide only recommends 3 to 8 sentences. There is no minimum, because
  // one-sentence paragraphs (a lead-in to a code block) are normal in reference docs.
  rules['plain-language/paragraph-sentence-count'] = {
    severity: 'warn',
    scope: 'paragraph',
    link: CLEAR_SHORT,
    message:
      'Paragraph is %s %s long; federal plain-language guidance recommends at most 8 (roughly 150 words) (max %s).',
    assertions: { length: { unit: 'sentences', max: 8 } },
  };

  // `be responsible for` -> `must` is left out because it is often correct
  // ("the team is responsible for the migration").
  rules['plain-language/filler-phrases'] = swapRule({
    pairs: {
      'a number of': 'several, a few, or many',
      'a sufficient number of': 'enough',
      'at this point in time': 'now',
      'is able to': 'can',
      'on a monthly basis': 'monthly',
      'on the ground that': 'because',
    },
    message: 'Prefer "%s" over the padded phrase "%s" (federal plain-language guidance).',
    link: STYLE_PAGE,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "an amount of X" -> "X" has no fixed replacement, so this is a pattern, not a swap.
  rules['plain-language/an-amount-of'] = patternRule({
    tokens: ['\\ban amount of\\b'],
    message:
      'Avoid the padded phrase "%s"; state the amount directly (federal plain-language guidance).',
    link: STYLE_PAGE,
    ignoreCase: true,
  });

  rules['plain-language/excess-intensifiers'] = patternRule({
    tokens: [
      '\\babsolutely\\b',
      '\\bactually\\b',
      '\\bcompletely\\b',
      '\\breally\\b',
      '\\bquite\\b',
      '\\btotally\\b',
      '\\bvery\\b',
    ],
    message: 'Consider cutting the intensifier "%s" (federal plain-language guidance).',
    link: SHORT_SIMPLE,
    ignoreCase: true,
  });

  rules['plain-language/complex-words'] = swapRule({
    pairs: {
      addressee: 'you',
      assist: 'help',
      assistance: 'help',
      commence: 'begin',
      'in order that': 'for',
      'in the amount of': 'for',
      'in the event of': 'if',
      promulgate: 'issue',
    },
    message: 'Use "%s" instead of "%s" (federal plain-language guidance).',
    link: FAMILIAR_TERMS,
    ignoreCase: true,
    wordBoundary: true,
  });

  // The live guide only lists these three pairs. Other common ones, such as
  // "each and every", are not in it.
  rules['plain-language/redundant-pairs'] = swapRule({
    pairs: {
      'due and payable': 'due',
      'cease and desist': 'stop',
      'knowledge and information': 'knowledge or information',
    },
    message: 'Use "%s" instead of the redundant pair "%s" (federal plain-language guidance).',
    link: SHORT_SIMPLE,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "may not ... until" and "is not ... unless" have words in between, so
  // they are patterns below.
  rules['plain-language/double-negative-phrases'] = swapRule({
    pairs: { 'has not yet attained': 'is under', 'no fewer than': 'at least' },
    message: 'Use "%s" instead of the double negative "%s" (federal plain-language guidance).',
    link: STYLE_PAGE,
    ignoreCase: true,
    wordBoundary: true,
  });

  // Both halves must be in the same sentence.
  rules['plain-language/double-negative-patterns'] = {
    severity: 'warn',
    scope: 'sentence',
    link: STYLE_PAGE,
    message:
      'Avoid the double-negative construction in "%s"; state it positively (federal plain-language guidance).',
    assertions: {
      pattern: {
        tokens: [
          '\\bmay not\\b(?:(?!\\buntil\\b)[\\s\\S])*?\\buntil\\b',
          '\\bis not\\b(?:(?!\\bunless\\b)[\\s\\S])*?\\bunless\\b',
        ],
        ignoreCase: true,
      },
    },
  };

  rules['plain-language/jargon-terms'] = swapRule({
    pairs: { 'Riverine avifauna': 'River birds', 'Involuntarily undomiciled': 'Unhoused' },
    message: 'Use "%s" instead of the jargon term "%s" (federal plain-language guidance).',
    link: AVOID_JARGON,
    ignoreCase: true,
    wordBoundary: true,
  });

  // Report only, never auto-fix.
  for (const rule of Object.values(rules)) {
    rule.fix = false;
  }

  return rules;
}
