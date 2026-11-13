import type { BaseRule, RecheckRules } from '../../types/index.js';

/**
 * `recheck/google`: rules from Google's developer documentation style guide
 * (https://developers.google.com/style).
 *
 * Source: Google developer documentation style guide
 * Canonical URL: https://developers.google.com/style
 * License: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)
 * Sync date: 2026-07-29
 *
 * Modified: rules are adapted to Recheck assertions and the wording is
 * paraphrased. Each rule links to its source page. See
 * `packages/recheck/presets/google/PROVENANCE.md` for the rule-to-source table
 * and the guide entries that were left out.
 *
 * Rules about document structure are `error`. Word choice and style rules are
 * `warn`. No rule fixes anything (see the end of `buildGooglePreset`), because
 * automatic swaps changed the meaning of correct text in testing.
 */

const HEADINGS = 'https://developers.google.com/style/headings';
const PERIODS = 'https://developers.google.com/style/periods';
const ACCESSIBILITY = 'https://developers.google.com/style/accessibility';
const LISTS = 'https://developers.google.com/style/lists';
const PERSON = 'https://developers.google.com/style/person';
const CONTRACTIONS = 'https://developers.google.com/style/contractions';
const WORD_LIST = 'https://developers.google.com/style/word-list';
const TIMELESS = 'https://developers.google.com/style/timeless-documentation';
const ABBREVIATIONS = 'https://developers.google.com/style/abbreviations';
const SLASHES = 'https://developers.google.com/style/slashes';
const NUMBERS = 'https://developers.google.com/style/numbers';
const DATES_TIMES = 'https://developers.google.com/style/dates-times';
const COMMAS = 'https://developers.google.com/style/commas';
const DASHES = 'https://developers.google.com/style/dashes';
const PRONOUNS = 'https://developers.google.com/style/pronouns';
const CROSS_REFERENCES = 'https://developers.google.com/style/cross-references';
const TEXT_FORMATTING = 'https://developers.google.com/style/text-formatting';
const CAPITALIZATION = 'https://developers.google.com/style/capitalization';
const CODE_IN_TEXT = 'https://developers.google.com/style/code-in-text';
const UI_ELEMENTS = 'https://developers.google.com/style/ui-elements';
const PROCEDURES = 'https://developers.google.com/style/procedures';
const INCLUSIVE_DOCUMENTATION = 'https://developers.google.com/style/inclusive-documentation';

function swapRule(opts: {
  pairs: Record<string, string>;
  message: string;
  link: string;
  scope?: string | string[];
  ignoreCase?: boolean;
  wordBoundary?: boolean;
  keysAreRegex?: boolean;
  fix?: false;
  severity?: 'warn' | 'error';
}): BaseRule {
  return {
    severity: opts.severity ?? 'warn',
    scope: opts.scope ?? 'summary',
    link: opts.link,
    message: opts.message,
    ...(opts.fix === false ? { fix: false as const } : {}),
    assertions: {
      swap: {
        pairs: opts.pairs,
        ignoreCase: opts.ignoreCase,
        wordBoundary: opts.wordBoundary,
        keysAreRegex: opts.keysAreRegex,
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
  includeCode?: boolean;
  severity?: 'warn' | 'error';
}): BaseRule {
  return {
    severity: opts.severity ?? 'warn',
    scope: opts.scope ?? 'summary',
    link: opts.link,
    message: opts.message,
    assertions: {
      pattern: {
        tokens: opts.tokens,
        ignoreCase: opts.ignoreCase,
        includeCode: opts.includeCode,
      },
    },
  };
}

function tokenRule(opts: {
  name: string;
  message: string;
  link: string;
  options?: Record<string, unknown>;
  severity?: 'warn' | 'error';
}): BaseRule {
  return {
    severity: opts.severity ?? 'error',
    link: opts.link,
    message: opts.message,
    assertions: { [opts.name]: opts.options ?? {} },
  };
}

export function buildGooglePreset(): RecheckRules {
  const rules: RecheckRules = {};

  // Structure

  rules['google/heading-sentence-case'] = {
    severity: 'error',
    scope: 'heading',
    fix: false,
    link: HEADINGS,
    message: '"%s" should use %s capitalization (Google: sentence case for headings).',
    assertions: { capitalization: { match: '$sentence' } },
  };

  rules['google/heading-increment'] = tokenRule({
    name: 'heading-increment',
    message:
      'Heading levels should only increment by one level at a time (Google: heading structure).',
    link: HEADINGS,
  });

  rules['google/single-h1'] = tokenRule({
    name: 'single-h1',
    message: 'Only use a level-1 heading once on a page (Google: heading structure).',
    link: HEADINGS,
  });

  rules['google/first-line-h1'] = tokenRule({
    name: 'first-line-h1',
    message: 'The first line in a file should be a top-level heading (Google: heading structure).',
    link: HEADINGS,
  });

  rules['google/no-duplicate-heading'] = tokenRule({
    name: 'no-duplicate-heading',
    message:
      'Headings should be unique so readers can jump between sections (Google: heading structure).',
    link: HEADINGS,
  });

  rules['google/no-trailing-punctuation'] = tokenRule({
    name: 'no-trailing-punctuation',
    message: "Don't end headings with periods (Google).",
    link: PERIODS,
  });

  rules['google/no-empty-headings'] = tokenRule({
    name: 'no-empty-headings',
    message: "Don't use empty headings; make sure headings are followed by content (Google).",
    link: HEADINGS,
  });

  rules['google/no-emphasis-as-heading'] = tokenRule({
    name: 'no-emphasis-as-heading',
    message: 'Tag headings using heading elements, not bold/italic text (Google: accessibility).',
    link: ACCESSIBILITY,
  });

  rules['google/no-link-in-heading'] = patternRule({
    tokens: ['\\[[^\\]]*\\]\\([^)]*\\)'],
    message: "Don't put links in headings (Google); move the link into the following paragraph.",
    link: HEADINGS,
    scope: 'heading',
    severity: 'error',
  });

  rules['google/list-item-capital'] = {
    severity: 'error',
    scope: 'list-item',
    fix: false,
    link: LISTS,
    message: '"%s" should use %s capitalization (Google: start list items with a capital letter).',
    assertions: { capitalization: { match: '$sentence' } },
  };

  rules['google/no-alt-text'] = tokenRule({
    name: 'no-alt-text',
    message: 'Every image needs alt text (Google: accessibility).',
    link: ACCESSIBILITY,
  });

  // GFM tables cannot merge cells, so this only matches raw HTML tables.
  // It needs `scope: 'all'` to see raw HTML.
  rules['google/no-merged-cells'] = patternRule({
    tokens: ['\\bcolspan\\s*=', '\\browspan\\s*='],
    message: "Don't merge table cells with colspan/rowspan (Google).",
    link: ACCESSIBILITY,
    scope: 'all',
    ignoreCase: true,
    severity: 'error',
  });

  rules['google/sentence-length'] = {
    severity: 'error',
    scope: 'sentence',
    link: ACCESSIBILITY,
    message: 'Sentence is %s %s long; Google recommends fewer than 26 words (max %s).',
    assertions: { length: { unit: 'words', max: 25 } },
  };

  // Headings and lists

  // `includeCode` so the code span itself is matched.
  rules['google/no-code-in-heading'] = patternRule({
    tokens: ['`[^`]+`'],
    message: 'Avoid code items in headings (Google); rephrase in plain words.',
    link: HEADINGS,
    scope: 'heading',
    includeCode: true,
  });

  // Only matches step/part markers and bare leading numbers, to avoid false positives.
  rules['google/no-numbered-headings'] = patternRule({
    tokens: ['^\\d+[.)]\\s', '^Step\\s+\\d+\\b', '^Part\\s+\\d+\\b'],
    message: "Don't use numbers in headings to indicate a sequence (Google).",
    link: HEADINGS,
    scope: 'heading',
    ignoreCase: true,
  });

  // Google gives no maximum, so only the minimum is set.
  rules['google/list-length'] = tokenRule({
    name: 'list-length',
    message:
      'List has %s item(s); a single item usually reads better as a plain sentence (Google).',
    link: LISTS,
    options: { min: 2 },
    severity: 'warn',
  });

  // Voice, person and contractions

  // Lists each casing of the pronouns instead of using `ignoreCase`,
  // which would also match the abbreviation "US".
  rules['google/second-person'] = patternRule({
    tokens: ['\\b(?:We|we|Our|our|Us|us)\\b'],
    message:
      'Use second person ("you"/"your") instead of "%s", unless referring to the organization itself (Google).',
    link: PERSON,
  });

  rules['google/use-contractions'] = swapRule({
    pairs: {
      'is not': "isn't",
      'are not': "aren't",
      'do not': "don't",
      'does not': "doesn't",
      'did not': "didn't",
      cannot: "can't",
      'will not': "won't",
      'have not': "haven't",
      'has not': "hasn't",
      'had not': "hadn't",
      'should not': "shouldn't",
      'would not': "wouldn't",
      'could not': "couldn't",
    },
    message: 'Use "%s" instead of "%s" (Google recommends negation contractions).',
    link: CONTRACTIONS,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/no-triple-contractions'] = patternRule({
    tokens: ["\\bmightn't've\\b", "\\bwouldn't've\\b", "\\bcouldn't've\\b", "\\bshouldn't've\\b"],
    message: 'Don\'t use three-word contractions such as "%s" (Google).',
    link: CONTRACTIONS,
    ignoreCase: true,
  });

  rules['google/no-lets'] = patternRule({
    tokens: ["\\blet's\\b"],
    message: '"%s": avoid if at all possible (Google).',
    link: `${WORD_LIST}#lets`,
    ignoreCase: true,
  });

  rules['google/no-please-note'] = swapRule({
    pairs: { 'please note': '' },
    message: '%sGoogle\'s style guide says not to use the phrase "%s"; remove it.',
    link: `${WORD_LIST}#please`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/no-please'] = patternRule({
    tokens: ['\\bplease\\b'],
    message:
      '"%s": only use when asking for permission or forgiveness, not in the normal course of instructions (Google).',
    link: `${WORD_LIST}#please`,
    ignoreCase: true,
  });

  // Timeless documentation

  // Only the distinctive phrases. Words like `new` and `now` match too much ordinary text.
  rules['google/no-timeless-phrases'] = patternRule({
    tokens: [
      '\\bas of this writing\\b',
      '\\bat present\\b',
      '\\bpresently\\b',
      '\\bdoes not yet\\b',
      '\\bcurrently\\b',
    ],
    message:
      '"%s" is implied by the existence of the documentation itself; consider removing it (Google).',
    link: TIMELESS,
    ignoreCase: true,
  });

  // Latinisms, abbreviations and slang

  // `wordBoundary` is off because a trailing `\b` after the period in "i.e." never matches.
  // The leading `\b` in each key stops "vs." matching inside "revs.".
  rules['google/no-latinisms'] = swapRule({
    pairs: {
      '\\bi\\.e\\.': 'that is',
      '\\be\\.g\\.': 'for example',
    },
    message: 'Use "%s" instead of "%s" (Google).',
    link: WORD_LIST,
    fix: false,
    ignoreCase: true,
    wordBoundary: false,
    keysAreRegex: true,
  });

  rules['google/vs-versus'] = swapRule({
    pairs: {
      '\\bvs\\.': 'versus',
    },
    message: 'Use "%s" instead of "%s" (Google).',
    link: WORD_LIST,
    ignoreCase: true,
    wordBoundary: false,
    keysAreRegex: true,
  });

  // Both keys are anchored on both sides so "aka" does not match inside "Osaka".
  rules['google/no-latinisms-plain'] = swapRule({
    pairs: {
      'vice versa': 'the other way around',
    },
    message: 'Use "%s" instead of "%s" (Google).',
    link: WORD_LIST,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['google/aka-form'] = swapRule({
    pairs: {
      aka: 'also known as',
    },
    message: 'Use "%s" instead of "%s" (Google).',
    link: WORD_LIST,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['google/no-internet-slang'] = swapRule({
    pairs: {
      'tl;dr': 'To summarize',
      ymmv: 'Your results might vary',
      RTFM: 'For more information, see...',
    },
    message: 'Avoid the internet-slang abbreviation "%s"; use "%s" instead (Google).',
    link: ABBREVIATIONS,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/no-via'] = patternRule({
    tokens: ['\\bvia\\b'],
    message:
      '"%s": avoid — Google\'s word list says not to use it; rephrase (e.g. "using", "through").',
    link: `${WORD_LIST}#via`,
    ignoreCase: true,
  });

  rules['google/abbrev-no-periods'] = patternRule({
    tokens: ['\\b(?:[A-Z]\\.){2,}'],
    message: 'Don\'t use periods with acronyms or initialisms such as "%s" (Google).',
    link: ABBREVIATIONS,
  });

  rules['google/us-abbreviation'] = swapRule({
    pairs: { 'U.S.A.': 'US', 'U.S.': 'US' },
    message: 'Use "%s" instead of "%s" (Google: US is OK as an abbreviation for United States).',
    link: `${WORD_LIST}#US`,
    fix: false,
    wordBoundary: false,
  });

  // `wordBoundary` is off because a trailing `\b` after the slash never matches.
  // The leading `\b` stops `w/` matching inside "www/static" and `c/o` inside
  // "src/output". The lookahead stops "w/o" and "c/oscillator" matching.
  rules['google/no-slash-abbrev'] = swapRule({
    pairs: { '\\bc/o(?![A-Za-z])': 'care of', '\\bw/(?![A-Za-z])': 'with' },
    message: 'Use "%s" instead of the slash abbreviation "%s" (Google).',
    link: SLASHES,
    ignoreCase: true,
    wordBoundary: false,
    keysAreRegex: true,
  });

  // Numbers, dates and units

  rules['google/spell-out-ordinals'] = patternRule({
    tokens: ['\\b\\d+(?:st|nd|rd|th)\\b'],
    message: 'Spell out ordinal numbers; avoid "%s" (Google).',
    link: NUMBERS,
  });

  rules['google/number-format'] = patternRule({
    tokens: [
      '\\d\\s%', // no space before the percent sign
      '(?<![\\d.])\\.\\d', // decimals under 1 need a leading zero
      '\\d+ x \\d+', // dimensions: lowercase x, no surrounding spaces
      '\\bfrom\\s+\\d+-\\d+\\b', // a hyphen range introduced by "from"
    ],
    message: 'Number formatting: "%s" doesn\'t match Google\'s stated convention.',
    link: NUMBERS,
  });

  rules['google/date-format'] = patternRule({
    tokens: ['\\b\\d{1,2}/\\d{1,2}/\\d{2,4}\\b'],
    message: 'Avoid all-numeric slash dates such as "%s" (Google); spell out the month.',
    link: DATES_TIMES,
  });

  rules['google/time-format'] = patternRule({
    tokens: [
      '\\d\\s?[ap]\\.m\\.', // lowercase, dotted a.m./p.m.
      '\\d(?:am|pm)\\b', // lowercase, no space, no periods
      '\\d(?:AM|PM)\\b', // missing the required space before AM/PM
      '\\b\\d{1,2}:00\\s?(?:AM|PM|am|pm)\\b', // round hour should drop :00
    ],
    message:
      '"%s": use all-caps AM/PM with a space before it, and drop :00 on round hours (Google).',
    link: `${WORD_LIST}#AM,_PM`,
  });

  rules['google/rfc-spacing'] = patternRule({
    tokens: ['\\bRFC\\d+\\b'],
    message: 'Use a space between RFC and the number, e.g. "RFC 2318" (Google): "%s"',
    link: `${WORD_LIST}#RFC`,
  });

  rules['google/data-rate-units'] = swapRule({
    pairs: {
      'KB/s': 'KBps',
      'Kb/s': 'Kbps',
      'MB/s': 'MBps',
      'Mb/s': 'Mbps',
      'GB/s': 'GBps',
      'Gb/s': 'Gbps',
    },
    message: 'Use "%s" instead of "%s" (Google: by convention we don\'t use the slash form).',
    link: `${WORD_LIST}#GBps`,
    wordBoundary: true,
  });

  // Punctuation

  // Only matches an ampersand with spaces around it, so `&amp;` and `AT&T` are left alone.
  rules['google/no-ampersand'] = patternRule({
    tokens: ['\\s&\\s'],
    message: 'Don\'t use "&" as a conjunction or shorthand for "and" (Google).',
    link: TEXT_FORMATTING,
  });

  // A Google-style em dash has no spaces around it.
  rules['google/dash-style'] = patternRule({
    tokens: ['\u2013', '\\s--\\s', '\\s\u2014\\s'],
    message:
      "Don't use an en dash or a double hyphen in place of an em dash; don't space the em dash (Google).",
    link: DASHES,
  });

  rules['google/single-space-sentences'] = patternRule({
    tokens: ['\\.  +\\S'],
    message: 'Leave only one space between sentences (Google).',
    link: PERIODS,
  });

  rules['google/conjunctive-adverb-comma'] = patternRule({
    tokens: ['^(?:Otherwise|However|Therefore) [a-z]'],
    message: 'Put a comma after "%s" when it opens a sentence (Google).',
    link: COMMAS,
    scope: 'sentence',
  });

  rules['google/comma-before-that'] = patternRule({
    tokens: [', that\\b'],
    message: 'Don\'t put a comma before restrictive "that" (Google).',
    link: PRONOUNS,
    scope: 'sentence',
  });

  rules['google/neither-nor'] = patternRule({
    tokens: ['\\bneither\\b(?:(?!\\bnor\\b)[\\s\\S])*?\\bor\\b'],
    message: 'Write "neither A nor B", not "neither A or B" (Google).',
    link: `${WORD_LIST}#neither`,
    scope: 'sentence',
  });

  rules['google/no-and-or'] = patternRule({
    tokens: ['\\band/or\\b'],
    message: 'Avoid "and/or" except where space is limited, such as in tables (Google).',
    link: SLASHES,
    ignoreCase: true,
  });

  // Links

  rules['google/vague-link-text'] = patternRule({
    tokens: ['\\b(?:this document|this article|this page|this topic|this doc|click here)\\b'],
    message: 'Avoid vague link text such as "%s"; describe the destination (Google).',
    link: CROSS_REFERENCES,
    scope: 'link',
    ignoreCase: true,
  });

  rules['google/no-url-as-link-text'] = patternRule({
    tokens: ['^https?://'],
    message: "Don't use a URL as link text (Google); use a descriptive phrase instead.",
    link: CROSS_REFERENCES,
    scope: 'link',
  });

  rules['google/link-intro-about'] = swapRule({
    pairs: {
      'for more information on': 'for more information about',
      'more details on': 'more details about',
    },
    message: 'Use "%s" instead of "%s" (Google: use "about", not "on").',
    link: CROSS_REFERENCES,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['google/link-punctuation'] = patternRule({
    tokens: ['^["\u201c].*["\u201d]$'],
    message: "Don't put link text in quotation marks (Google).",
    link: CROSS_REFERENCES,
    scope: 'link',
  });

  rules['google/no-target-blank'] = patternRule({
    tokens: ['target\\s*=\\s*["\']_blank["\']'],
    message: "Don't force links to open in a new tab or window (Google).",
    link: CROSS_REFERENCES,
    scope: 'all',
  });

  rules['google/self-reference-terms'] = patternRule({
    tokens: ['\\bthis article\\b', '\\bthis topic\\b', '\\bthis doc\\b', '\\bthis page\\b'],
    message: 'Use "this document" instead of "%s" when referring to the current document (Google).',
    link: `${WORD_LIST}#documentation`,
    ignoreCase: true,
  });

  // Text formatting

  rules['google/emphasis-style'] = {
    severity: 'warn',
    link: TEXT_FORMATTING,
    message: 'Use underscores for emphasis/italics, not asterisks (Google).',
    assertions: { 'emphasis-style': { style: 'underscore' } },
  };

  rules['google/strong-style'] = {
    severity: 'warn',
    link: TEXT_FORMATTING,
    message: 'Use double asterisks for bold, not underscores (Google).',
    assertions: { 'strong-style': { style: 'asterisk' } },
  };

  rules['google/no-underline'] = patternRule({
    tokens: ['<u>'],
    message: 'Reserve underlining for link text (Google).',
    link: TEXT_FORMATTING,
    scope: 'all',
    ignoreCase: true,
  });

  rules['google/no-casing-style-names'] = patternRule({
    tokens: ['\\bcamel[\\s-]?case\\b', '\\bsnake[\\s-]?case\\b'],
    message:
      'Don\'t use a casing style name such as "%s"; describe the naming convention instead (Google).',
    link: CAPITALIZATION,
    ignoreCase: true,
  });

  // Code in text

  // `includeCode` because the match includes the closing backtick.
  rules['google/no-inflected-code'] = patternRule({
    tokens: ["`[^`]+`'s\\b", '`[^`]+`s\\b'],
    message: 'Don\'t inflect the name of a code element (Google): "%s"',
    link: CODE_IN_TEXT,
    includeCode: true,
  });

  // UI elements and verbs

  rules['google/ui-element-quotes'] = patternRule({
    tokens: ['"[A-Z][a-zA-Z ]*"\\s+(?:button|tab|menu|checkbox|option|link|field)\\b'],
    message: 'Don\'t put UI element names in quotation marks; use bold instead (Google): "%s"',
    link: UI_ELEMENTS,
  });

  rules['google/no-click-on'] = swapRule({
    pairs: { 'click on': 'click' },
    message: 'Use "%s" instead of "%s" (Google).',
    link: `${WORD_LIST}#click`,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['google/no-hover'] = patternRule({
    tokens: ['\\bhover(?:s|ing|ed)?\\b'],
    message: 'Use "hold the pointer over" instead of "%s" (Google).',
    link: `${WORD_LIST}#hover`,
    ignoreCase: true,
  });

  // Bare "check" is too common to swap, and "deselect" is correct for other elements.
  rules['google/no-uncheck'] = swapRule({
    pairs: { uncheck: 'clear' },
    message: 'Use "%s" instead of "%s" for checkboxes (Google).',
    link: `${WORD_LIST}#uncheck`,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['google/scroll-to'] = swapRule({
    pairs: { 'scroll to': 'go to' },
    message: 'Prefer "%s" over "%s" (Google).',
    link: `${WORD_LIST}#scroll`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // Only matches verb use, so the noun in "toggle switch" is not flagged.
  rules['google/no-toggle-verb'] = patternRule({
    tokens: ['\\btoggle(?:d|s)?\\s+(?:the|this|that|a|an)\\b', '\\bto toggle\\b'],
    message: 'Describe the action instead of using "toggle" as a verb (Google): "%s"',
    link: UI_ELEMENTS,
    ignoreCase: true,
  });

  rules['google/keyboard-keys'] = patternRule({
    tokens: ['\\bctrl\\b', '\\bcmd\\b', '\u2318'],
    message: 'Spell out modifier keys (Control, Command) instead of "%s" (Google).',
    link: UI_ELEMENTS,
    ignoreCase: true,
  });

  rules['google/chapter-terminology'] = patternRule({
    tokens: ['\\bchapters?\\b'],
    message: 'Refer to "document", "page", or "section" instead of "%s" (Google, for web docs).',
    link: `${WORD_LIST}#chapter`,
    ignoreCase: true,
  });

  // Plain language

  rules['google/plain-language-swaps'] = swapRule({
    pairs: {
      'allows you to': 'lets you',
      'enables you to': 'lets you',
      comprise: 'consist of',
      'comprised of': 'consist of',
      desire: 'want',
      desired: 'wanted',
      wish: 'want',
      learnings: 'knowledge',
      agnostic: 'platform-independent',
    },
    message: 'Prefer "%s" over "%s" (Google: plain language).',
    link: WORD_LIST,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['google/in-order-to'] = swapRule({
    pairs: { 'in order to': 'to' },
    message: 'Prefer "%s" over "%s" unless needed to clarify meaning (Google).',
    link: `${WORD_LIST}#in_order_to`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/utilize'] = patternRule({
    tokens: ['\\butiliz(?:e|es|ed|ing|ation)\\b'],
    message:
      'Use "use" instead of "%s" unless referring to the quantity of a resource used (Google).',
    link: `${WORD_LIST}#utilize`,
    ignoreCase: true,
  });

  rules['google/leverage'] = swapRule({
    pairs: { leverage: 'use', leveraging: 'using', leveraged: 'used' },
    message: 'Avoid "%s" if you mean "use", "build on", or "take advantage of" (Google): "%s"',
    link: `${WORD_LIST}#leverage`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/performant'] = patternRule({
    tokens: ['\\bperformant\\b'],
    message: 'Avoid "%s"; use a more precise term (Google).',
    link: `${WORD_LIST}#performant`,
    ignoreCase: true,
  });

  rules['google/copy-and-paste'] = patternRule({
    tokens: ['\\bcopy and paste\\b'],
    message: 'Explain what to enter into a field, not how to enter it (Google): "%s"',
    link: `${WORD_LIST}#Copy_and_paste`,
    ignoreCase: true,
  });

  rules['google/create-a-new'] = swapRule({
    pairs: { 'Create a new': 'Create a' },
    message:
      'Use "%s ..." instead of "%s ..." unless distinguishing from another recently created item (Google).',
    link: `${WORD_LIST}#Create_a_new`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/no-run-the-following-command'] = patternRule({
    tokens: ['\\brun the following command\\b'],
    message: 'Focus on what the command does instead of "%s" (Google).',
    link: PROCEDURES,
    ignoreCase: true,
  });

  rules['google/cons-and-pros'] = swapRule({
    pairs: { 'pros and cons': 'advantages and disadvantages' },
    message: 'Use "%s" instead of "%s" (Google).',
    link: `${WORD_LIST}#pros`,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // Product and brand names

  // `keysAreRegex` lets "Cloud console" skip text that already follows "Google"
  // in any casing or spacing.
  rules['google/product-names'] = swapRule({
    pairs: {
      'Cloud Platform': 'Google Cloud',
      '(?<![Gg][Oo][Oo][Gg][Ll][Ee]\\s+)Cloud console': 'Google Cloud console',
      'Developers Console': 'Google Cloud console',
      'Google Cloud SDK': 'Cloud SDK',
      'API explorer': 'APIs Explorer',
      'API Explorer': 'APIs Explorer',
      'developer key': 'API key',
      'dev key': 'API key',
      'API Console key': 'API key',
      'account name': 'username',
      'curated roles': 'predefined roles',
      'network IP address': 'internal IP address',
      'MIME type': 'media type',
      'interconnect type': 'connection type',
      'peer zone': 'peering zone',
      'Android device': 'Android-powered device',
      'Android devices': 'Android-powered devices',
    },
    message: 'Use "%s" instead of "%s" (Google product naming).',
    link: WORD_LIST,
    fix: false,
    wordBoundary: true,
    keysAreRegex: true,
  });

  rules['google/gcp-name'] = swapRule({
    pairs: { GCP: 'Google Cloud' },
    message: 'Use "%s" instead of "%s" (Google product naming).',
    link: WORD_LIST,
    fix: false,
    wordBoundary: true,
  });

  // Case-sensitive on purpose, so only the wrongly cased form matches.
  rules['google/brand-capitalization'] = swapRule({
    pairs: {
      'Google Play Services': 'Google Play services',
      'Google account': 'Google Account',
      'Google accounts': 'Google Accounts',
      cURL: 'curl',
    },
    message: 'Use "%s" instead of "%s" (Google: fixed brand capitalization).',
    link: WORD_LIST,
    wordBoundary: true,
  });

  // These lowercase phrases also have ordinary meanings, such as "a markdown of
  // thirty percent", so they are kept apart from the rule above.
  rules['google/brand-capitalization-proper-noun'] = swapRule({
    pairs: {
      markdown: 'Markdown',
      'material design': 'Material Design',
      'search console': 'Search Console',
    },
    message: 'Use "%s" instead of "%s" (Google: fixed brand capitalization).',
    link: WORD_LIST,
    fix: false,
    wordBoundary: true,
  });

  // Compound and one-word forms

  rules['google/compound-forms'] = swapRule({
    pairs: {
      'e-mail': 'email',
      'E-mail': 'email',
      'e-commerce': 'ecommerce',
      'web page': 'webpage',
      'check box': 'checkbox',
      'code base': 'codebase',
      'code lab': 'codelab',
      'code-lab': 'codelab',
      'data store': 'datastore',
      datacenter: 'data center',
      datatype: 'data type',
      'file name': 'filename',
      filesystem: 'file system',
      'front-end': 'frontend',
      'front end': 'frontend',
      'back-end': 'backend',
      'back end': 'backend',
      'host name': 'hostname',
      'end point': 'endpoint',
      'name space': 'namespace',
      nameserver: 'name server',
      'life cycle': 'lifecycle',
      'life-cycle': 'lifecycle',
      'live stream': 'livestream',
      'health care': 'healthcare',
      'health-care': 'healthcare',
      'on prem': 'on-premises',
      'on premise': 'on-premises',
      'on-premise': 'on-premises',
      'read only': 'read-only',
      'pre-built': 'prebuilt',
      'run book': 'runbook',
      'screen shot': 'screenshot',
      'time stamp': 'timestamp',
      'time frame': 'timeframe',
      'time-to-live': 'time to live',
      'tool kit': 'toolkit',
      'tool-kit': 'toolkit',
      'touch screen': 'touchscreen',
      'user base': 'userbase',
      'walk-through': 'walkthrough',
      webserver: 'web server',
      'white paper': 'whitepaper',
      'white space': 'whitespace',
      'wild card': 'wildcard',
      statusbar: 'status bar',
      'status-bar': 'status bar',
      'key/value pair': 'key-value pair',
      'key value pair': 'key-value pair',
      singlemost: 'single most',
      signin: 'sign-in',
      signout: 'sign-out',
      'auto-healing': 'autohealing',
      'auto-scaling': 'autoscaling',
      'auto-populate': 'autopopulate',
      'auto populate': 'autopopulate',
      'auto-tagging': 'autotagging',
      'pre-capture': 'precapture',
      'pre-emptible': 'preemptible',
      preexisting: 'pre-existing',
      'pre-recorded': 'prerecorded',
      'preshared key': 'pre-shared key',
      'pre-submit': 'presubmit',
      'meta-feed': 'metafeed',
      'meta-generation': 'metageneration',
      'inter-cluster': 'intercluster',
      'sub-tree': 'subtree',
      'sub-zone': 'subzone',
      'sub zone': 'subzone',
      subcommand: 'sub-command',
      'co-locate': 'colocate',
      'blue/green': 'blue-green',
      'blue green': 'blue-green',
      'parent\u2014child': 'parent-child',
      'long running operation': 'long-running operation',
      'hard-code': 'hardcode',
      'hard-coded': 'hardcoded',
      'in-line': 'inline',
      Unixlike: 'Unix-like',
      'Unix like': 'Unix-like',
      'resource recordset': 'resource record set',
    },
    message: 'Use "%s" instead of "%s" (Google compound-word form).',
    link: WORD_LIST,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['google/compound-forms-word-choice'] = swapRule({
    pairs: {
      'data cleansing': 'data cleaning',
      transcompile: 'transpile',
      autoupdate: 'automatically update',
      'pre-emptive': 'preemptible',
      noops: 'fully managed',
      NoOps: 'fully managed',
    },
    message: 'Use "%s" instead of "%s" (Google compound-word form).',
    link: WORD_LIST,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "datasource" is also a Java and Spring class and property name.
  rules['google/compound-forms-proper-noun'] = swapRule({
    pairs: {
      datasource: 'data source',
    },
    message: 'Use "%s" instead of "%s" (Google compound-word form).',
    link: WORD_LIST,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "colo" is a noun and "colocate" is a verb, so a swap can break the grammar.
  rules['google/colo-form'] = swapRule({
    pairs: { colo: 'colocate' },
    message: 'Use "%s" instead of "%s" (Google compound-word form).',
    link: WORD_LIST,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // "in line" is not a pair, because "in line with" and "wait in line" are correct.

  // Case-sensitive on purpose, so lowercase "https" in a URL is not matched.
  rules['google/acronym-forms'] = swapRule({
    pairs: {
      HTTPs: 'HTTPS',
      IPSec: 'IPsec',
      'No-SQL': 'NoSQL',
      'No SQL': 'NoSQL',
      // Skips "OAuth 2.0", which is already correct.
      'OAuth 2(?!\\.0)': 'OAuth 2.0',
      OAuth2: 'OAuth 2.0',
      Oauth: 'OAuth 2.0',
      'micro-services': 'microservices',
      'fin-tech': 'fintech',
      adtech: 'ad tech',
      'ad-tech': 'ad tech',
    },
    message: 'Use "%s" instead of "%s" (Google: fixed acronym/abbreviation form).',
    link: WORD_LIST,
    wordBoundary: true,
    keysAreRegex: true,
  });

  // "FinTech Group AG" and "I-O DATA" are real company names.
  rules['google/acronym-forms-proper-noun'] = swapRule({
    pairs: {
      'I-O': 'I/O',
      FinTech: 'fintech',
    },
    message: 'Use "%s" instead of "%s" (Google: fixed acronym/abbreviation form).',
    link: WORD_LIST,
    fix: false,
    wordBoundary: true,
    keysAreRegex: true,
  });

  // "IO" is also part of names like "Socket.IO".
  rules['google/acronym-caps-detect-only'] = swapRule({
    pairs: { UNICODE: 'Unicode', IPSEC: 'IPsec', IO: 'I/O' },
    message: 'Use "%s" instead of "%s" (Google: fixed acronym/abbreviation form).',
    link: WORD_LIST,
    wordBoundary: true,
    fix: false,
  });

  // Does not match "HMAC-SHA1", which the guide allows.
  rules['google/sha1-form'] = swapRule({
    pairs: { '(?<!-)\\bSHA1\\b': 'SHA-1' },
    message: 'Use "%s" instead of "%s" (Google: fixed acronym/abbreviation form).',
    link: WORD_LIST,
    wordBoundary: false,
    keysAreRegex: true,
    fix: false,
  });

  // Inclusive language

  // Bare "master" is not flagged because it has many other meanings.
  rules['google/master-slave'] = swapRule({
    pairs: { slave: 'worker' },
    message: 'Avoid "%s"; use "worker" or "replica" instead (Google).',
    link: `${WORD_LIST}#slave`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/blacklist-whitelist'] = swapRule({
    pairs: {
      blacklist: 'denylist',
      whitelist: 'allowlist',
      graylist: 'denylist',
      greylist: 'denylist',
    },
    message: 'Use "%s" instead of "%s" (Google inclusive language).',
    link: `${WORD_LIST}#blacklist`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/black-white-hat'] = swapRule({
    pairs: {
      'black hat': 'unethical',
      blackhat: 'unethical',
      'white hat': 'ethical',
      whitehat: 'ethical',
    },
    message: 'Use a precise term such as "%s" instead of "%s" (Google inclusive language).',
    link: `${WORD_LIST}#blackhat`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/black-white-box-testing'] = swapRule({
    pairs: {
      'black-box testing': 'opaque-box testing',
      'black box testing': 'opaque-box testing',
      'white-box testing': 'clear-box testing',
      'white box testing': 'clear-box testing',
      'black-box monitoring': 'synthetic monitoring',
      'white-box monitoring': 'introspective monitoring',
    },
    message: 'Use "%s" instead of "%s" (Google inclusive language).',
    link: `${WORD_LIST}#black-box`,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['google/grayed-out'] = swapRule({
    pairs: { 'grayed-out': 'unavailable', 'greyed-out': 'unavailable' },
    message: 'Use "%s" instead of "%s" (Google inclusive language).',
    link: `${WORD_LIST}#grayed-out`,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['google/grandfathered'] = swapRule({
    pairs: { grandfathered: 'legacy', 'grandfather clause': 'exempt' },
    message: 'Use "%s" instead of "%s" (Google inclusive language).',
    link: `${WORD_LIST}#grandfathered`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/gendered-terms'] = swapRule({
    pairs: {
      'you guys': 'everyone',
      guys: 'everyone',
      'male adapter': 'plug',
      'female adapter': 'socket',
      'man hours': 'person hours',
      manhours: 'person hours',
      manmade: 'artificial',
      'man made': 'artificial',
      manned: 'staffed',
      manpower: 'staff',
      'man-power': 'staff',
      'man-in-the-middle': 'on-path attacker',
      'he/she': 'they',
      webmaster: 'website owner',
    },
    message: 'Use non-gendered language such as "%s" instead of "%s" (Google inclusive language).',
    link: `${WORD_LIST}#man_hours`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/jargon-with-people-references'] = swapRule({
    pairs: {
      gypsy: 'Romani',
      ghetto: 'clumsy',
      ninja: 'expert',
      guru: 'expert',
      sherpa: 'guide',
      dojo: 'training',
      'mom test': 'beginner user test',
      'grandma test': 'beginner user test',
      'girlfriend test': 'beginner user test',
      'monkey test': 'automated, random tests',
      'brown bag': 'learning session',
      'brown-bag': 'learning session',
      'build cop': 'build monitor',
      'build sheriff': 'build monitor',
      'war room': 'incident-management team',
      warroom: 'incident-management team',
      'final solution': 'solution',
      'demilitarized zone': 'perimeter network',
      DMZ: 'perimeter network',
      denigrate: 'disparage',
      sexy: 'elegant',
      nuke: 'remove',
      voodoo: 'mysterious',
      'first-class citizen': 'higher-order value',
      'first class citizen': 'higher-order value',
    },
    message: 'Use a precise term such as "%s" instead of "%s" (Google jargon/inclusive language).',
    link: `${WORD_LIST}#ninja`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // "mad", "hang" and "hung" are left out because they usually have other meanings.
  rules['google/ableist-figurative-terms'] = swapRule({
    pairs: {
      crazy: 'unexpected',
      insane: 'unexpected',
      lunatic: 'unexpected',
      bonkers: 'unexpected',
      loony: 'unexpected',
      sane: 'valid',
      'sanity check': 'quick check',
      'dumb down': 'simplify',
      retarded: 'slowed',
    },
    message:
      'Use a precise term such as "%s" instead of "%s" when describing a system or object (Google).',
    link: `${WORD_LIST}#crazy`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/dummy-variable'] = swapRule({
    pairs: { 'dummy variable': 'placeholder' },
    message:
      'Use "%s" instead of "%s" (Google): for a statistics sense, see the word list for alternatives.',
    link: `${WORD_LIST}#dummy-variable`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // Only the figurative sense. "blind writes" is a real technical term.
  rules['google/blind-figurative'] = patternRule({
    tokens: ['\\bblind to\\b', '\\bblind eye to\\b'],
    message: 'Use "ignore", "unaware of", "disregard", or "reject" instead of "%s" (Google).',
    link: `${WORD_LIST}#blind`,
    ignoreCase: true,
  });

  // This is about people who are blind, not the figurative use above.
  rules['google/unsighted-visually-challenged'] = swapRule({
    pairs: {
      unsighted: 'person who is blind',
      'visually challenged': 'person who is visually impaired',
    },
    message: 'Use "%s" instead of "%s" (Google inclusive language).',
    link: `${WORD_LIST}#unsighted`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/disability-language'] = swapRule({
    pairs: {
      'the disabled': 'people with disabilities',
      'a quadriplegic': 'a quadriplegic person',
      'wheelchair-bound': 'uses a wheelchair',
      'suffering from': 'experiencing',
      'victim of': 'living with',
    },
    message: 'Use "%s" instead of "%s" (Google inclusive documentation).',
    link: INCLUSIVE_DOCUMENTATION,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // These are about precision, not people. Bare "fat" is left out because of the FAT
  // file system.
  rules['google/technical-jargon-precision'] = swapRule({
    pairs: {
      'fat client': 'full-featured client',
      'fat connection': 'high-capacity network connection',
      chubby: 'overextended',
    },
    message:
      'Use a precise term such as "%s" instead of "%s" (Google: technical-jargon precision, not people).',
    link: `${WORD_LIST}#fat`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // Rules never fix, even if a swap sets `fix`.
  for (const rule of Object.values(rules)) {
    rule.fix = false;
  }

  return rules;
}
