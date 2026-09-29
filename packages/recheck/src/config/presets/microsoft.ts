import type { BaseRule, RecheckRules } from '../../types/index.js';

/**
 * `recheck/microsoft`: rules from the Microsoft Writing Style Guide
 * (https://learn.microsoft.com/en-us/style-guide/welcome/).
 *
 * Source: Microsoft Writing Style Guide
 * Canonical URL: https://learn.microsoft.com/en-us/style-guide/welcome/
 * Upstream status: archived on 2024-11-13, but still published.
 * License: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). The license
 * is stated in the guide's GitHub repository, not on learn.microsoft.com:
 * https://github.com/MicrosoftDocs/microsoft-style-guide/blob/main/LICENSE
 * Sync date: 2026-07-30.
 *
 * Modified: rules are adapted to Recheck assertions and the wording is
 * paraphrased. Each rule links to its source page. See
 * `packages/recheck/presets/microsoft/PROVENANCE.md` for the rule-to-source table
 * and the guide entries that were left out.
 *
 * Structure rules are `error`. Voice, punctuation and UI verb rules are `warn`.
 * No rule fixes anything (see the end of `buildMicrosoftPreset`), because
 * automatic swaps changed the meaning of correct text in testing.
 *
 * Left out on purpose: terms the guide allows in developer content (`header`,
 * `context menu`, `disk`, `directory`), points where the guide contradicts
 * itself (`%` vs. "percent", `etc.`), and a readability `metric` rule, because
 * the guide gives no readability score.
 */

const CAPITALIZATION = 'https://learn.microsoft.com/en-us/style-guide/capitalization';
const HEADINGS = 'https://learn.microsoft.com/en-us/style-guide/scannable-content/headings';
const COLONS = 'https://learn.microsoft.com/en-us/style-guide/punctuation/colons';
const VERSUS_VS =
  'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/v/versus-vs';
const ACCESSIBILITY_WRITING =
  'https://learn.microsoft.com/en-us/style-guide/accessibility/writing-all-abilities';
const APOSTROPHES = 'https://learn.microsoft.com/en-us/style-guide/punctuation/apostrophes';
const ACRONYMS = 'https://learn.microsoft.com/en-us/style-guide/acronyms';
const LISTS = 'https://learn.microsoft.com/en-us/style-guide/scannable-content/lists';
const TABLES = 'https://learn.microsoft.com/en-us/style-guide/scannable-content/tables';
const PERIODS = 'https://learn.microsoft.com/en-us/style-guide/punctuation/periods';
const TOP_10_TIPS = 'https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice';
const DASHES_HYPHENS = 'https://learn.microsoft.com/en-us/style-guide/punctuation/dashes-hyphens/';
const NUMBERS = 'https://learn.microsoft.com/en-us/style-guide/numbers';
const QUOTATION_MARKS = 'https://learn.microsoft.com/en-us/style-guide/punctuation/quotation-marks';
const ALTERNATIVE_TEXT =
  'https://learn.microsoft.com/en-us/style-guide/accessibility/alternative-text';
const URLS_WEB_ADDRESSES = 'https://learn.microsoft.com/en-us/style-guide/urls-web-addresses';
const USE_CONTRACTIONS =
  'https://learn.microsoft.com/en-us/style-guide/word-choice/use-contractions';
const USE_US_SPELLING =
  'https://learn.microsoft.com/en-us/style-guide/word-choice/use-us-spelling-avoid-non-english-words';
const USE_SIMPLE_WORDS =
  'https://learn.microsoft.com/en-us/style-guide/word-choice/use-simple-words-concise-sentences';
const DONT_USE_COMMON_WORDS =
  'https://learn.microsoft.com/en-us/style-guide/word-choice/dont-use-common-words-in-new-ways';
const AVOID_JARGON = 'https://learn.microsoft.com/en-us/style-guide/word-choice/avoid-jargon';
const BIAS_FREE = 'https://learn.microsoft.com/en-us/style-guide/bias-free-communication';
const MILITARISTIC_LANGUAGE = 'https://learn.microsoft.com/en-us/style-guide/militaristic-language';
const ACCESSIBILITY_TERMS =
  'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/term-collections/accessibility-terms';
const AZ_BASE = 'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/';
const DESCRIBING_UI =
  'https://learn.microsoft.com/en-us/style-guide/procedures-instructions/describing-interactions-with-ui';
const FORMATTING_TEXT_IN_INSTRUCTIONS =
  'https://learn.microsoft.com/en-us/style-guide/procedures-instructions/formatting-text-in-instructions';
const MASTER_SLAVE =
  'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/m/master-slave';

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

export function buildMicrosoftPreset(): RecheckRules {
  const rules: RecheckRules = {};

  // Structure

  rules['microsoft/heading-sentence-case'] = {
    severity: 'error',
    scope: 'heading',
    fix: false,
    link: CAPITALIZATION,
    message: '"%s" should use %s capitalization (Microsoft: sentence case for headings).',
    assertions: { capitalization: { match: '$sentence' } },
  };

  // Only headings, because Microsoft's colon rule is about titles and headings.
  rules['microsoft/capitalize-after-heading-colon'] = patternRule({
    tokens: [':\\s+[a-z]'],
    message: 'Capitalize the first word after a colon in a heading (Microsoft).',
    link: COLONS,
    scope: 'heading',
  });

  rules['microsoft/no-trailing-punctuation'] = tokenRule({
    name: 'no-trailing-punctuation',
    message: "Don't end headings with punctuation (Microsoft).",
    link: HEADINGS,
  });

  rules['microsoft/no-ampersand-in-headings'] = {
    severity: 'warn',
    scope: 'heading',
    link: HEADINGS,
    message: 'Spell out "and"; avoid & and + in headings (Microsoft).',
    exceptions: { lines: ['C++', 'A+', '.NET'] },
    assertions: {
      pattern: { tokens: ['&(?!amp;|nbsp;|lt;|gt;|quot;|#)', '\\+'] },
    },
  };

  // Two scoped rules with opposite directions: `vs.` in headings, "versus" in text.
  rules['microsoft/vs-in-headings'] = swapRule({
    pairs: { versus: 'vs.' },
    message: 'Use "%s" instead of "%s" in headings (Microsoft).',
    link: VERSUS_VS,
    scope: 'heading',
    ignoreCase: true,
    wordBoundary: true,
  });

  // A trailing `\b` after the period in "vs." never matches, so the key starts with
  // `\b` instead. That still stops "revs." from matching.
  rules['microsoft/versus-in-text'] = swapRule({
    pairs: { '\\bvs\\.': 'versus' },
    message: 'Use "%s" instead of "%s" in body text (Microsoft).',
    link: VERSUS_VS,
    scope: ['paragraph', 'list-item', 'table.cell'],
    ignoreCase: true,
    wordBoundary: false,
    keysAreRegex: true,
  });

  rules['microsoft/no-multiple-blanks'] = tokenRule({
    name: 'no-multiple-blanks',
    message: "Don't use extra blank lines to create heading spacing (Microsoft).",
    link: HEADINGS,
  });

  rules['microsoft/no-emphasis-as-heading'] = tokenRule({
    name: 'no-emphasis-as-heading',
    message: 'Use a heading level, not bold or italic text, to show hierarchy (Microsoft).',
    link: ACCESSIBILITY_WRITING,
  });

  // Only the decade form (`1990's`). `API's` is usually a valid possessive.
  rules['microsoft/no-apostrophe-plural-decade'] = patternRule({
    tokens: ["\\b(?:19|20)\\d0['\u2019]s\\b"],
    message: 'Don\'t use an apostrophe to form a plural decade (Microsoft): "%s"',
    link: APOSTROPHES,
  });

  // Each pair must change the text: `'a SQL': 'a SQL'` would flag correct text.
  rules['microsoft/article-before-acronym'] = swapRule({
    pairs: {
      'an URL': 'a URL',
      'a ISP': 'an ISP',
      'an SQL database': 'a SQL database',
      'an SQL': 'a SQL',
    },
    message: 'Use "%s" instead of "%s" (Microsoft: article choice follows pronunciation).',
    link: ACRONYMS,
    ignoreCase: true,
    wordBoundary: true,
  });

  // A custom regex checks only the first letter. `$sentence` would also lowercase
  // later words.
  rules['microsoft/list-item-capital'] = {
    severity: 'error',
    scope: 'list-item',
    fix: false,
    link: LISTS,
    message: '"%s" should start with a capital letter (Microsoft).',
    assertions: { capitalization: { match: '^[^a-z].*' } },
  };

  rules['microsoft/no-trailing-conjunction-list'] = patternRule({
    tokens: ['[,;]$', '\\b(?:and|or)$'],
    message: 'Don\'t end a list item with a semicolon, comma, or conjunction (Microsoft): "%s"',
    link: LISTS,
    scope: 'list-item',
    ignoreCase: true,
  });

  rules['microsoft/no-ellipsis-column-header'] = patternRule({
    tokens: ['(?:\\.\\.\\.|\u2026)$'],
    message: 'Don\'t end a table column header with an ellipsis (Microsoft): "%s"',
    link: TABLES,
    scope: 'table.header',
  });

  // Only catches a cell that contains just an em dash. A `pattern` token cannot match
  // an empty cell.

  // The trailing `\s*` is inside the optional group so that long whitespace-only
  // cells do not match slowly.
  rules['microsoft/no-blank-table-cell'] = patternRule({
    tokens: ['^\\s*(?:\u2014\\s*)?$'],
    message: 'Use "Not applicable" or "None" instead of an em dash in a table cell (Microsoft).',
    link: TABLES,
    scope: 'table.cell',
  });

  rules['microsoft/single-space-after-punctuation'] = patternRule({
    tokens: ['[.!?:]\\s{2,}(?=[A-Z])'],
    message: 'Use one space, not two, after end punctuation (Microsoft).',
    link: PERIODS,
  });

  // Only em dashes. The guide allows spaces around en dashes in UI timestamps and
  // date ranges, which a regex cannot tell apart.
  rules['microsoft/no-space-around-em-dash'] = patternRule({
    tokens: ['\\s\u2014\\s'],
    message: "Don't use spaces around an em dash (Microsoft).",
    link: DASHES_HYPHENS,
  });

  rules['microsoft/no-from-before-en-dash-range'] = patternRule({
    tokens: ['\\bfrom\\s+\\d+\\s*[\u2013\u2014]\\s*\\d+'],
    message: 'Don\'t use "from" before an en-dash number range (Microsoft): "%s"',
    link: NUMBERS,
  });

  rules['microsoft/straight-quotes'] = swapRule({
    pairs: {
      '\u201c': '"',
      '\u201d': '"',
      '\u2018': "'",
      '\u2019': "'",
    },
    message: 'Use straight quotation marks, not curly ones (Microsoft).',
    link: QUOTATION_MARKS,
  });

  rules['microsoft/spell-out-ordinals'] = patternRule({
    tokens: ['\\b\\d+(?:st|nd|rd|th)\\b'],
    message: 'Spell out ordinal numbers; avoid "%s" (Microsoft).',
    link: NUMBERS,
  });

  rules['microsoft/ordinal-no-ly'] = swapRule({
    pairs: { firstly: 'first', secondly: 'second', thirdly: 'third' },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: NUMBERS,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['microsoft/noon-midnight'] = patternRule({
    tokens: ['\\b12:00\\s*(?:AM|PM|am|pm)\\b'],
    message: 'Use "noon" or "midnight" instead of "%s" (Microsoft).',
    link: NUMBERS,
  });

  rules['microsoft/no-alt-text'] = tokenRule({
    name: 'no-alt-text',
    message: 'Every image needs alt text (Microsoft: accessibility).',
    link: ALTERNATIVE_TEXT,
  });

  rules['microsoft/alt-text-length'] = {
    severity: 'warn',
    scope: 'alt',
    link: ALTERNATIVE_TEXT,
    message: 'Alt text is %s %s long; Microsoft limits it to 150 characters (max %s).',
    assertions: { length: { unit: 'characters', max: 150 } },
  };

  // Does not cover the guide's allowance for fragments.
  rules['microsoft/alt-text-format'] = {
    severity: 'warn',
    scope: 'alt',
    fix: false,
    link: ALTERNATIVE_TEXT,
    message: 'Alt text should start with a capital letter and end with a period (Microsoft).',
    assertions: { capitalization: { match: '^[A-Z].*\\.$' } },
  };

  // Screenshot, Diagram, Photograph, Chart and Drawing are allowed openers, so they
  // are not matched.
  rules['microsoft/alt-text-generic-opener'] = patternRule({
    tokens: ['^(?:Image|Icon|Graphic|Button|Link)\\b'],
    message: 'Don\'t start alt text with a generic word such as "%s" (Microsoft).',
    link: ALTERNATIVE_TEXT,
    scope: 'alt',
    ignoreCase: true,
  });

  rules['microsoft/alt-text-no-filename'] = patternRule({
    tokens: ['\\.(?:png|jpe?g|gif|svg|webp)$'],
    message: "Don't use an image's file name as its alt text (Microsoft).",
    link: ALTERNATIVE_TEXT,
    scope: 'alt',
    ignoreCase: true,
  });

  rules['microsoft/descriptive-link-text'] = tokenRule({
    name: 'descriptive-link-text',
    message: 'Link text should be descriptive, not a generic phrase (Microsoft).',
    link: URLS_WEB_ADDRESSES,
  });

  // Numeric limits from the guide

  // Counts sentences as a stand-in for "lines", which Markdown does not have.
  // Only the upper limit (7) is set, because short single-sentence paragraphs are
  // normal in reference docs.
  rules['microsoft/paragraph-length'] = {
    severity: 'warn',
    scope: 'paragraph',
    link: 'https://learn.microsoft.com/en-us/style-guide/scannable-content/',
    message:
      'Paragraph is %s %s long; Microsoft suggests at most 7 (sentences, as a proxy for lines).',
    assertions: { length: { unit: 'sentences', max: 7 } },
  };

  rules['microsoft/list-length'] = tokenRule({
    name: 'list-length',
    message: 'List has %s item(s); Microsoft recommends 2-7 (Microsoft).',
    link: LISTS,
    options: { min: 2, max: 7 },
    severity: 'warn',
  });

  rules['microsoft/comma-density'] = {
    severity: 'warn',
    scope: 'sentence',
    link: 'https://learn.microsoft.com/en-us/style-guide/punctuation/',
    message: 'Sentence has %s commas; Microsoft suggests at most %s.',
    assertions: { occurrence: { pattern: ',', max: 2 } },
  };

  // Voice and contractions

  rules['microsoft/use-contractions'] = swapRule({
    pairs: {
      cannot: "can't",
      'can not': "can't",
      'do not': "don't",
      'does not': "doesn't",
      'did not': "didn't",
      'is not': "isn't",
      'are not': "aren't",
      'was not': "wasn't",
      'were not': "weren't",
      'will not': "won't",
      'would not': "wouldn't",
      'should not': "shouldn't",
      'could not': "couldn't",
      'have not': "haven't",
      'has not': "hasn't",
      'had not': "hadn't",
      'it is': "it's",
      'you are': "you're",
      'we are': "we're",
      'they are': "they're",
      'you will': "you'll",
      'let us': "let's",
    },
    message: 'Microsoft style prefers the contraction "%s" over "%s".',
    link: USE_CONTRACTIONS,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['microsoft/no-awkward-contractions'] = patternRule({
    tokens: [
      "\\b(?:there['\u2019]d|it['\u2019]ll|they['\u2019]d|that['\u2019]ll|there['\u2019]ll)\\b",
    ],
    message: 'Avoid the ambiguous contraction "%s" (Microsoft).',
    link: USE_CONTRACTIONS,
    ignoreCase: true,
  });

  rules['microsoft/contraction-consistency'] = {
    severity: 'warn',
    scope: 'summary',
    link: USE_CONTRACTIONS,
    message: '"%s" conflicts with the first-used form "%s" in this file (Microsoft).',
    assertions: {
      consistency: {
        ignoreCase: true,
        either: {
          "can't": 'cannot',
          "don't": 'do not',
          "won't": 'will not',
          "isn't": 'is not',
          "it's": 'it is',
        },
      },
    },
  };

  rules['microsoft/no-weak-phrasing'] = patternRule({
    tokens: ['\\bthere (?:is|are|was|were)\\b'],
    message: 'Avoid weak phrasing such as "%s"; start the sentence with a verb (Microsoft).',
    link: TOP_10_TIPS,
    scope: ['paragraph', 'list-item'],
    ignoreCase: true,
  });

  rules['microsoft/avoid-please'] = patternRule({
    tokens: ['\\bplease\\b'],
    message: 'Avoid "%s" except when asking the customer to do something inconvenient (Microsoft).',
    link: 'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/p/please',
    ignoreCase: true,
  });

  // US spelling, Latin abbreviations and simple words

  // One pair per word form instead of a pattern with groups, because a swap uses
  // fixed replacement text. For example "modelling" and "modeled" need separate pairs.
  // `dialogue box` is left out because `microsoft/dialog-terminology` covers it.
  // `centre`, `centres`, `catalogue` and `catalogues` are in `us-spelling-detect`.
  rules['microsoft/us-spelling'] = swapRule({
    pairs: {
      '\\bcentred\\b': 'centered',
      '\\bcentring\\b': 'centering',
      '\\bcatalogued\\b': 'cataloged',
      '\\bcataloguing\\b': 'cataloging',
      '\\bcancelled\\b': 'canceled',
      '\\bcancelling\\b': 'canceling',
      '\\bfavourite\\b': 'favorite',
      '\\bauthorise\\b': 'authorize',
      '\\bauthorises\\b': 'authorizes',
      '\\bauthorised\\b': 'authorized',
      '\\bauthorising\\b': 'authorizing',
      '\\bauthorisation\\b': 'authorization',
      '\\bcustomise\\b': 'customize',
      '\\bcustomises\\b': 'customizes',
      '\\bcustomised\\b': 'customized',
      '\\bcustomising\\b': 'customizing',
      '\\bcustomisation\\b': 'customization',
      '\\blabelled\\b': 'labeled',
      '\\blabelling\\b': 'labeling',
      '\\bmodelled\\b': 'modeled',
      '\\bmodelling\\b': 'modeling',
    },
    message: 'Use the US spelling "%s" instead of "%s" (Microsoft).',
    link: USE_US_SPELLING,
    severity: 'error',
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // These words are also in proper names, such as "Bell Centre", "Centre County"
  // and "Catalogue of Life".
  rules['microsoft/us-spelling-detect'] = swapRule({
    pairs: {
      '\\bcentre\\b': 'center',
      '\\bcentres\\b': 'centers',
      '\\bcatalogue\\b': 'catalog',
      '\\bcatalogues\\b': 'catalogs',
    },
    message: 'Use the US spelling "%s" instead of "%s" (Microsoft).',
    link: USE_US_SPELLING,
    severity: 'error',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // `e.g.` and `i.e.` start with `\b` only, because a trailing `\b` after the period
  // never matches. `de facto`, `ad hoc` and `vis-a-vis` are in the `-detect` rule,
  // because the guide gives no replacement for them.
  rules['microsoft/no-latin-abbreviations'] = swapRule({
    pairs: {
      '\\be\\.g\\.,?': 'for example',
      '\\bi\\.e\\.,?': 'that is',
      '\\bviz\\.': 'namely',
      '\\bergo\\b': 'therefore',
    },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: USE_US_SPELLING,
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    wordBoundary: false,
    keysAreRegex: true,
  });

  rules['microsoft/no-latin-abbreviations-detect'] = patternRule({
    tokens: ['\\bde facto\\b', '\\bad hoc\\b', '\\bvis-[\u00e0a]-vis\\b'],
    message:
      'Microsoft style: avoid the non-English phrase "%s" — no single replacement is prescribed; rewrite for the context (Microsoft).',
    link: USE_US_SPELLING,
    severity: 'error',
    ignoreCase: true,
  });

  // `in addition` skips "in addition to", which is correct.
  rules['microsoft/simple-words'] = swapRule({
    pairs: {
      '\\butilize\\b': 'use',
      '\\butilise\\b': 'use',
      '\\bmake use of\\b': 'use',
      '\\bin order to\\b': 'to',
      '\\bas a means to\\b': 'to',
      '\\bin addition\\b(?!\\s+to\\b)': 'also',
      '\\bestablish connectivity\\b': 'connect',
      '\\binform\\b': 'tell',
    },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: USE_SIMPLE_WORDS,
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  rules['microsoft/leverage'] = swapRule({
    pairs: { leverage: 'use', leveraging: 'using', leveraged: 'used' },
    message:
      'Rewrite "%s" using "%s" (Microsoft): only the VERB sense ("leverage the API") is targeted — "leverage"/"leveraged" are also common, correct nouns/adjectives ("financial leverage", "a leveraged buyout") a blind substitution would corrupt.',
    link: AVOID_JARGON,
    severity: 'error',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['microsoft/glyph'] = swapRule({
    pairs: { glyph: 'symbol' },
    message:
      'Use "%s" instead of "%s" (Microsoft) when referring generically to a UI icon/image — but it\'s OK to use "glyph" in a technical discussion of fonts and characters.',
    link: AVOID_JARGON,
    severity: 'error',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['microsoft/bucketize'] = swapRule({
    pairs: { bucketize: 'group' },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: DONT_USE_COMMON_WORDS,
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // Only matches the verb with an object, since "the impact of" is a valid noun use.
  rules['microsoft/impact-verb'] = patternRule({
    tokens: [
      '\\bimpact(?:s|ed|ing)?\\s+(?:performance|productivity|quality|reliability|availability|latency|throughput)\\b',
    ],
    message: 'Use "affect" instead of "impact" as a verb (Microsoft): "%s"',
    link: DONT_USE_COMMON_WORDS,
  });

  // Skips the bid/ask market sense of "the ask".
  rules['microsoft/the-ask'] = swapRule({
    pairs: {
      '\\bthe ask\\b(?!\\s+(?:tick|ticks|price|prices|spread|spreads|size|quote|quotes)\\b)':
        'the request',
    },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: DONT_USE_COMMON_WORDS,
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // Bias-free, militaristic and derogatory language

  // `DMZ` skips the DMZ between North and South Korea.
  rules['microsoft/bias-free-terms'] = swapRule({
    pairs: {
      chairman: 'chair',
      chairwoman: 'chair',
      mankind: 'humanity',
      manmade: 'synthetic',
      'man-made': 'synthetic',
      manpower: 'workforce',
      salesman: 'sales representative',
      salesmen: 'sales representatives',
      'demilitarized zone': 'perimeter network',
      '\\bDMZ\\b(?!\\s+(?:dividing|between|separating)\\b)': 'perimeter network',
      'screened subnet': 'perimeter network',
    },
    message: 'Use "%s" instead of "%s" (Microsoft: bias-free communication).',
    link: BIAS_FREE,
    severity: 'error',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: true,
  });

  // The two Microsoft pages agree the term is wrong but suggest different
  // replacements, so this only reports it.
  rules['microsoft/master-slave'] = patternRule({
    tokens: ['\\bmaster\\s*/\\s*slave\\b', '\\bmaster-slave\\b'],
    message:
      'Avoid "%s" (Microsoft): the guide\'s two pages disagree on the replacement — use "primary/subordinate" (bias-free-communication) or "primary/replica" (also acceptable: primary/secondary, principal/agent, controller/worker; a-z/master-slave) depending on context.',
    link: MASTER_SLAVE,
    severity: 'error',
    ignoreCase: true,
  });

  rules['microsoft/cyberattack-spelling'] = swapRule({
    pairs: {
      'cyber attack': 'cyberattack',
      'cyber-attack': 'cyberattack',
      'cyber threat': 'cyberthreat',
      'cyber-threat': 'cyberthreat',
    },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: MILITARISTIC_LANGUAGE,
    severity: 'error',
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['microsoft/no-derogatory-slang'] = patternRule({
    tokens: ['\\bpimp\\b', '\\bbitch\\b', '\\bspirit animal\\b'],
    message: 'Avoid the derogatory or culturally appropriative term "%s" (Microsoft).',
    link: BIAS_FREE,
    severity: 'error',
    ignoreCase: true,
  });

  // `white` and `multiracial` are not included: a capitalized "White" matches too many
  // names, such as White House.
  rules['microsoft/racial-ethnic-capitalization'] = swapRule({
    pairs: {
      asian: 'Asian',
      'black and african american': 'Black and African American',
      'hispanic and latinx': 'Hispanic and Latinx',
      'native american': 'Native American',
      'alaska native': 'Alaska Native',
      'native hawaiian': 'Native Hawaiian',
      'pacific islander': 'Pacific Islander',
      'indigenous peoples': 'Indigenous Peoples',
    },
    message: 'Use title-style capitalization: "%s" instead of "%s" (Microsoft).',
    link: BIAS_FREE,
    severity: 'error',
    ignoreCase: false,
    wordBoundary: true,
  });

  // Accessibility terms

  // Reports only, with no replacement. "mute" is limited to forms like "is mute" and
  // "deaf-mute", because "mute the audio" is a normal UI phrase. "normal person" and
  // "healthy person" are matched as phrases, because bare "normal" has other meanings,
  // such as a normal distribution.
  rules['microsoft/accessibility-terms'] = patternRule({
    tokens: [
      '\\bcrippled\\b',
      '\\bhandicapped\\b',
      '\\bthe handicapped\\b',
      '\\bpeople with handicaps\\b',
      '\\bslow learner\\b',
      '\\bmentally handicapped\\b',
      '\\bdifferently abled\\b',
      '\\bspecial needs\\b',
      '\\baffected by\\b',
      '\\bstricken with\\b',
      '\\bsuffers from\\b',
      '\\ba victim of\\b',
      '\\bsight-impaired\\b',
      '\\bvision-impaired\\b',
      '\\bhearing-impaired\\b',
      '\\bnon-verbal\\b',
      '\\bmaimed\\b',
      '\\bmissing a limb\\b',
      '\\bbirth defect\\b',
      '\\bSpecial Ed person\\b',
      '\\bnormal person\\b',
      '\\bhealthy person\\b',
      "\\bAsperger['\u2019]s\\b",
      '\\bdumb\\b',
      '\\b(?:is|was|are|were|being|been)\\s+mute\\b',
      '\\bdeaf and mute\\b',
      '\\bdeaf-mute\\b',
      '\\blame\\b',
      '\\bstupid\\b',
      // "an epileptic" is allowed before seizure, episode, fit or attack, where it
      // describes the event.
      '\\ban epileptic\\b(?!\\s+(?:seizure|episode|fit|attack|event))',
    ],
    message:
      'Use people-first language instead of "%s" — see the accessibility term collection (Microsoft).',
    link: ACCESSIBILITY_TERMS,
    severity: 'error',
    ignoreCase: true,
  });

  // Spelling and hyphenation

  rules['microsoft/spelling-hyphenation'] = swapRule({
    pairs: {
      '\\be-?mail\\b(?<!email)': 'email',
      '\\bdata ?base\\b(?<!database)': 'database',
      '\\bend ?point\\b(?<!endpoint)': 'endpoint',
      '\\bweb ?site\\b(?<!website)': 'website',
      '\\bweb ?page\\b(?<!webpage)': 'webpage',
      '\\bwork ?station\\b(?<!workstation)': 'workstation',
      '\\bscreen ?shot\\b(?<!screenshot)': 'screenshot',
      '\\btask ?bar\\b(?<!taskbar)': 'taskbar',
      '\\bname ?space\\b(?<!namespace)': 'namespace',
      '\\bplug-in\\b': 'plugin',
      '\\becommerce\\b': 'e-commerce',
      '\\belearning\\b': 'e-learning',
      '\\bebook\\b': 'e-book',
      '\\bcyber-security\\b': 'cybersecurity',
      '\\bco-author\\b': 'coauthor',
      // "dial up" and "single sign on" need no guard: the correct forms are hyphenated,
      // so the pattern cannot match them.
      '\\bdial ?up\\b': 'dial-up',
      '\\bread only\\b': 'read-only',
      '\\bcontext sensitive\\b': 'context-sensitive',
      '\\bsingle sign ?on\\b': 'single sign-on',
      '\\bmulti-factor\\b': 'multifactor',
      '\\bmulti-cloud\\b': 'multicloud',
      '\\bmulti-tenant\\b': 'multitenant',
      '\\bwell-being\\b': 'wellbeing',
      '\\btool ?tip\\b(?<!tooltip)': 'tooltip',
      '\\bimbed\\b': 'embed',
    },
    message: 'Microsoft style spells this "%s", not "%s".',
    link: AZ_BASE + 'e/email',
    severity: 'error',
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // Case-sensitive and separate from `spelling-hyphenation`, which ignores case and
  // would also match "tooltip".
  rules['microsoft/tooltip-capitalization'] = swapRule({
    pairs: { ToolTip: 'tooltip' },
    message: 'Use "%s", not "%s" (Microsoft: tooltip is one word, lowercase).',
    link: AZ_BASE + 't/tooltip',
    severity: 'error',
    ignoreCase: false,
    wordBoundary: true,
  });

  // Case-only changes

  // Pairs whose replacement is the same word in another casing, such as `Internet`
  // and `internet`. Pairs that need more than a case change are in `az-case-fixable`.

  rules['microsoft/az-case-only'] = swapRule({
    pairs: {
      Internet: 'internet',
      Intranet: 'intranet',
      Extranet: 'extranet',
      Euro: 'euro',
      WWW: 'www',
      Registry: 'registry',
      Spam: 'spam',
    },
    message: 'Use "%s" instead of "%s" (Microsoft): rewrite, this fix would silently no-op.',
    link: AZ_BASE + 'i/internet-intranet-extranet',
    severity: 'error',
    fix: false,
    ignoreCase: false,
    wordBoundary: true,
  });

  // `World Wide Web` is in `world-wide-web`. `boolean` is in `az-case-fixable-detect`,
  // because lowercase `boolean` is the correct OpenAPI type name.
  rules['microsoft/az-case-fixable'] = swapRule({
    pairs: {
      'Big Data': 'big data',
      'Dark Mode': 'dark mode',
      darkmode: 'dark mode',
      Devops: 'DevOps',
      devops: 'DevOps',
      bluetooth: 'Bluetooth',
      Javascript: 'JavaScript',
      javascript: 'JavaScript',
    },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: AZ_BASE + 'i/internet-intranet-extranet',
    severity: 'error',
    ignoreCase: false,
    wordBoundary: true,
  });

  rules['microsoft/az-case-fixable-detect'] = swapRule({
    pairs: {
      boolean: 'Boolean',
    },
    message:
      'Use "%s" instead of "%s" (Microsoft) in ordinary prose -- but lowercase "boolean" is correct and expected when naming the OpenAPI/JSON Schema type.',
    link: AZ_BASE + 'i/internet-intranet-extranet',
    severity: 'error',
    fix: false,
    ignoreCase: false,
    wordBoundary: true,
  });

  rules['microsoft/world-wide-web'] = swapRule({
    pairs: { 'World Wide Web': 'web' },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: AZ_BASE + 'i/internet-intranet-extranet',
    severity: 'warn',
    fix: false,
    ignoreCase: false,
    wordBoundary: true,
  });

  // Terms that can also be verbs, such as "whitelist an address". The message says
  // to rewrite instead of replace.

  rules['microsoft/az-verb-able'] = swapRule({
    pairs: {
      blacklist: 'block list',
      whitelist: 'allow list',
      allowlist: 'allow list',
      blocklist: 'block list',
    },
    message: 'Rewrite "%s" using "%s" (Microsoft): a direct substitution may be ungrammatical.',
    link: AZ_BASE + 'b/blacklist',
    severity: 'error',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // A-Z word list

  // Pairs with conditional or several replacements are in `*-detect` rules, which
  // only report.

  // `crash` and `lock up` are in `az-state-failure-detect`: "crash dump" is a noun, and
  // the guide gives different replacements for hardware and software.
  // `hang` skips idioms such as "hang on", "hang up", "get the hang of" and
  // "hang in there".
  rules['microsoft/az-state-failure'] = swapRule({
    pairs: {
      '\\bhangs\\b(?!\\s+(?:on|up|around|out|together|of|in|tight|loose|fire|from|over)\\b)':
        'stops responding',
      '\\bhang\\b(?!\\s+(?:on|up|around|out|together|of|in|tight|loose|fire|from|over)\\b)':
        'stop responding',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'h/hang',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // `crash` skips noun compounds such as "crash dump".
  rules['microsoft/az-state-failure-detect'] = patternRule({
    tokens: ['\\bcrash\\b(?!\\s+(?:dump|report|log|course|test|site)\\b)', '\\block up\\b'],
    message:
      'Microsoft style: "%s" needs a context-specific replacement (fail for hardware, stop responding for programs).',
    link: AZ_BASE + 'c/crash',
    severity: 'error',
    ignoreCase: true,
  });

  // `terminate` is not included: "terminate the instance" is normal cloud wording.
  // `quit`, `deinstall` and `reinitialize` are in the `-detect` rule. `exit`, `launch`
  // and `boot` skip noun uses such as "exit code", "product launch" and "boot disk".
  rules['microsoft/az-lifecycle-verbs'] = swapRule({
    pairs: {
      '\\bcarry out\\b': 'run',
      '(?<!\\b(?:the|an|no|emergency)\\s)\\bexit\\b(?!\\s+(?:code|status|button|sign|strategy|interview|poll|ramp|velocity|row)\\b)':
        'close',
      '(?<!\\b(?:product|software|game|website|app|feature|rocket|mission)\\s)\\blaunch\\b(?!\\s+(?:date|event|party|window|site|pad|day|plan|schedule|announcement)\\b)':
        'open',
      '\\bboot\\b(?!\\s+(?:disk|sector|loader|sequence|process|time|options?|record|partition|menu|order|camera)\\b)':
        'turn on',
      '\\bundelete\\b': 'restore',
      '\\binstantiate\\b': 'create an instance of',
      '\\biconize\\b': 'minimize',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'b/boot',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  rules['microsoft/az-lifecycle-verbs-detect'] = patternRule({
    tokens: ['\\bquit\\b', '\\bdeinstall\\b', '\\breinitialize\\b'],
    message:
      'Microsoft style: "%s" needs a context-specific replacement or carries a conditional exception — see the a-z word list before rewriting.',
    link: AZ_BASE + 'q/quit',
    severity: 'error',
    ignoreCase: true,
  });

  // `deprecated` is not included: it is correct OpenAPI wording, and the guide only
  // discourages it for general audiences. `SKU` and `SMB` are not included because
  // they are also common technical terms, such as a product SKU or the SMB protocol.
  rules['microsoft/az-judgment-words'] = swapRule({
    pairs: {
      '\\bfinalize\\b': 'finish',
      '\\bbug fix\\b': 'software update',
      '\\bbeta\\b(?!\\s+(?:distribution|function|coefficient|particle|blocker|decay)\\b)':
        'preview',
      '\\bEULA\\b': 'license terms',
      '\\bEnd-User License Agreement\\b': 'license terms',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'f/finalize',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  rules['microsoft/actionable'] = patternRule({
    tokens: ['\\bactionable\\b'],
    message: 'Avoid "%s"; rewrite using "that you can act on" (Microsoft).',
    link: AZ_BASE + 'a/actionable',
    ignoreCase: true,
  });

  // "U.S." and "U.S.A." start with `\b` only, because a trailing `\b` after the period
  // never matches. `thank you` is in `az-geography-detect`.
  rules['microsoft/az-geography'] = swapRule({
    pairs: {
      '\\bFar East\\b': 'East Asia',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'f/far-east',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // Some organization names keep these forms, such as "USA Gymnastics" and
  // "U.S. Bank".
  rules['microsoft/usa-abbreviation'] = swapRule({
    pairs: {
      '\\bUSA\\b': 'US',
      '\\bU\\.S\\.A\\.': 'US',
      '\\bU\\.S\\.': 'US',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'f/far-east',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  rules['microsoft/az-geography-detect'] = patternRule({
    tokens: ['\\bthank you\\b'],
    message:
      'Microsoft style: prefer "thanks" over "%s" in most content — see the a-z word list for the formal/serious-content exception.',
    link: AZ_BASE + 't/thanks-thank-you',
    severity: 'error',
    ignoreCase: true,
  });

  // `bottom left` and `bottom right` are in the `-detect` rule, because they are also
  // API property names such as `BottomLeft`.
  rules['microsoft/az-direction-layout'] = swapRule({
    pairs: {
      'top left': 'upper left',
      'top right': 'upper right',
      'far-left': 'leftmost',
      'far-right': 'rightmost',
      'left-justified': 'left-aligned',
      'right-justified': 'right-aligned',
      'ragged right': 'left-aligned',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'f/far-left-far-right',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['microsoft/az-direction-layout-detect'] = patternRule({
    tokens: ['\\bbottom left\\b', '\\bbottom right\\b'],
    message:
      'Microsoft style: use "lower left"/"lower right" instead of "%s" — except when discussing the BottomLeft/BottomRight API properties (Microsoft).',
    link: AZ_BASE + 'b/bottom-left-bottom-right',
    severity: 'error',
    ignoreCase: true,
  });

  rules['microsoft/left-hand-right-hand'] = swapRule({
    pairs: { 'left-hand': 'left', 'right-hand': 'right' },
    message:
      'Rewrite "%s" using "%s" (Microsoft): no replacement is stated for the modifier sense.',
    link: AZ_BASE + 'l/left-leftmost-left-hand',
    severity: 'error',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // `blade` skips noun compounds such as "blade server". `hierarchical menu`,
  // `secondary menu`, `running head` and `running foot` are in the `-detect` rule.
  rules['microsoft/az-ui-nouns'] = swapRule({
    pairs: {
      '\\bblade\\b(?!\\s+(?:server|servers|enclosure|chassis|centers?|centres?)\\b)': 'pane',
      '\\binsertion point\\b': 'pointer',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'b/blade',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  rules['microsoft/az-ui-nouns-detect'] = patternRule({
    tokens: [
      '\\bhierarchical menu\\b',
      '\\bsecondary menu\\b',
      '\\brunning head\\b',
      '\\brunning foot\\b',
    ],
    message:
      'Microsoft style: "%s" carries a conditional exception — see the a-z word list before rewriting.',
    link: AZ_BASE + 'h/hierarchical-menu',
    severity: 'error',
    ignoreCase: true,
  });

  // `italics` and `italicized` are in `italic-as-noun`, because "use italics" cannot
  // be swapped for the adjective. `roman` skips "Roman numerals", "Roman Empire" and
  // similar.
  rules['microsoft/az-typography'] = swapRule({
    pairs: {
      '\\btypeface\\b': 'font',
      '\\btype style\\b': 'font style',
      '\\bbolded\\b': 'bold',
      '\\bboldface\\b': 'bold',
      '\\broman\\b(?!\\s+(?:numeral|numerals|empire|alphabet|calendar|law|catholic|republic|mythology|god|gods|ruins?|coins?|holiday|road|roads|bath|baths|army|legion|forum|senate|aqueduct)\\b)':
        'regular type',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'r/roman',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  rules['microsoft/italic-as-noun'] = patternRule({
    tokens: ['\\bitalics\\b', '\\bitalicized\\b'],
    message: 'Avoid "%s"; rewrite using "italic" as an adjective, e.g. "italic text" (Microsoft).',
    link: AZ_BASE + 'i/italic',
    severity: 'error',
    ignoreCase: true,
  });

  // `directory`, `disk` and `context menu` are not included. The guide allows them
  // in developer content.
  rules['microsoft/az-filesystem'] = swapRule({
    pairs: {
      'child folder': 'subfolder',
      // Skips "home directory for its config files".
      '\\bhome directory\\b(?!\\s+for\\s+(?:its|the|your|his|her|their)?\\s*config)':
        'root directory',
      'graphics adapter': 'video card',
      'display adapter': 'video card',
      'video adapter': 'video card',
      'graphics card': 'video card',
      'display driver': 'video driver',
      'graphics driver': 'video driver',
      'remote drive': 'network drive',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'c/child-folder',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: true,
  });

  // `labelled` and `labelling` are in `us-spelling`. `indices` is not included,
  // because "array indices" is normal in developer docs.
  // `as well as` and `or greater`/`or higher`/`or lower` are in `az-grammar-usage-detect`:
  // "and" cannot replace "as well as" at the start of a sentence, and "or later" only
  // makes sense for version numbers.
  rules['microsoft/az-grammar-usage'] = swapRule({
    pairs: {
      towards: 'toward',
      upwards: 'upward',
      afterwards: 'afterward',
      useable: 'usable',
      moveable: 'movable',
      broadcasted: 'broadcast',
      matrixes: 'matrices',
      appendixes: 'appendices',
      zeroes: 'zeros',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'a/as-well-as',
    severity: 'error',
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['microsoft/az-grammar-usage-substitutions'] = swapRule({
    pairs: {
      'whether or not': 'whether',
      'center around': 'center on',
      'different to': 'different from',
      'inside of': 'inside',
      'outside of': 'outside',
      'off of': 'off',
      administrate: 'administer',
      alphabetic: 'alphabetical',
      mathematic: 'mathematical',
      numerical: 'numeric',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'a/as-well-as',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['microsoft/az-grammar-usage-detect'] = patternRule({
    tokens: ['\\bas well as\\b', '\\bor greater\\b', '\\bor higher\\b', '\\bor lower\\b'],
    message:
      'Microsoft style: "%s" needs a context-specific rewrite, not a blind substitution — "as well as" is a caution against treating it as a synonym for "and", not an instruction to replace it; "or greater/higher/lower" only becomes "or later/earlier" when identifying program or app version numbers, not general magnitude (Microsoft).',
    link: AZ_BASE + 'a/as-well-as',
    severity: 'error',
    ignoreCase: true,
  });

  // "multi-factor" is in `spelling-hyphenation`. `all right` and `alright` are in
  // `az-abbreviations-substitutions`. `pound sign` is in the `-detect` rule, because the
  // guide allows "pound key" for telephones.
  rules['microsoft/az-abbreviations-names'] = swapRule({
    pairs: {
      defrag: 'defragment',
      okay: 'OK',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'h/hexadecimal',
    severity: 'error',
    ignoreCase: true,
    wordBoundary: true,
  });

  // These can be right in other senses: "on spec", "hex nut", "put a hex on" and
  // "all right" as two words.
  rules['microsoft/az-abbreviations-substitutions'] = swapRule({
    pairs: {
      hex: 'hexadecimal',
      // Skips the idiom "on spec".
      '(?<!\\bon\\s)\\bspec\\b': 'specification',
      MSFT: 'Microsoft',
      alright: 'OK',
      'all right': 'OK',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'h/hexadecimal',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: true,
  });

  rules['microsoft/az-abbreviations-names-detect'] = patternRule({
    tokens: ['\\bpound sign\\b'],
    message:
      'Microsoft style: use "number sign" instead of "%s" — except for the literal phone-keypad key (Microsoft).',
    link: AZ_BASE + 'n/number-sign',
    severity: 'error',
    ignoreCase: true,
  });

  // `visit` is in `az-navigation-detect`: the guide allows it in a suggestive tone, and
  // "a visit" is also a noun. `bookmark` has its own rule because it is also used as a
  // verb.
  rules['microsoft/az-navigation'] = swapRule({
    pairs: {
      '\\bhot link\\b': 'link',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'v/visit',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  rules['microsoft/az-navigation-detect'] = patternRule({
    tokens: ['\\bvisit\\b(?!\\s+(?:count|counts|duration|frequency|history|log|data)\\b)'],
    message:
      'Microsoft style: use "go to" instead of "%s" in most cases — but "visit" is OK for a suggestion/browsing tone (Microsoft); see the a-z word list before rewriting.',
    link: AZ_BASE + 'v/visit',
    severity: 'error',
    ignoreCase: true,
  });

  rules['microsoft/bookmark-favorite'] = swapRule({
    pairs: { bookmark: 'favorite' },
    message: 'Rewrite "%s" using "%s" (Microsoft): a direct substitution may be ungrammatical.',
    link: AZ_BASE + 'b/bookmark',
    severity: 'error',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // Terms with no replacement in the guide.
  rules['microsoft/az-no-replacement'] = patternRule({
    tokens: [
      '\\bblack box\\b',
      '\\bdot-com\\b',
      '\\bedutainment\\b',
      '\\bhoneypot\\b',
      '\\bbackbone\\b',
      '\\bwordwrap\\b',
      '\\bnatural user interface\\b',
      '\\bNUI\\b',
      '\\bsubaddress\\b',
    ],
    message: 'Don\'t use "%s" (Microsoft); be specific instead.',
    link: AZ_BASE + 'b/black-box',
    severity: 'error',
    ignoreCase: true,
  });

  // `print out` skips noun uses such as "the print out of the receipt".
  rules['microsoft/az-real-replacements'] = swapRule({
    pairs: {
      '\\bfriendly name\\b': 'display name',
      '\\bprint queue\\b': 'list of documents',
      '\\bprinter queue\\b': 'list of documents',
      '\\bdata record\\b': 'record',
      '\\be-form\\b': 'form',
      '\\bupsize\\b': 'scale up',
      '\\bworking memory\\b': 'available memory',
      '\\bsoft copy\\b': 'file',
      '(?<!\\b(?:a|an|the|this|that|your|my|its|his|her|their|our)\\s)\\bprint out\\b(?!\\s+of\\b)':
        'print',
      '\\bsearch and replace\\b': 'find and replace',
      '\\btarget drive\\b': 'destination drive',
      '\\btarget file\\b': 'destination file',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'f/friendly-name',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // UI verbs, checkbox and dialog terms

  // Skips `double-click`, `right-click`, `clickstream` and noun uses such as "click
  // count".
  rules['microsoft/no-click'] = swapRule({
    pairs: {
      'click on': 'select',
      '(?<![\\w-])click(?![a-zA-Z])(?!\\s+(?:count|counts|rate|rates|event|events|tracking|data|metrics?|history|id|ids|per)\\b)':
        'select',
      '(?<![\\w-])clicks(?![a-zA-Z])(?!\\s+(?:count|counts|rate|rates|event|events|tracking|data|metrics?|history|per)\\b)':
        'selects',
      '(?<![\\w-])clicking(?![a-zA-Z])': 'selecting',
      '(?<![\\w-])clicked(?![a-zA-Z])': 'selected',
    },
    message: 'Use "%s" instead of "%s" (Microsoft: avoid input-specific verbs).',
    fix: false,
    link: DESCRIBING_UI,
    ignoreCase: true,
    wordBoundary: false,
    keysAreRegex: true,
  });

  // Only matches phrases about pressing keys. Bare "press", "hit" and "strike" have
  // too many other meanings.
  rules['microsoft/press-key-verb'] = patternRule({
    tokens: [
      '\\b(?:press|hit|strike)\\s+(?:the\\s+)?(?:Enter|Tab|Esc|Escape|Delete|Backspace|spacebar|Ctrl|Shift|Alt)\\b',
      '\\b(?:press|hit|strike)\\s+the\\s+\\S+\\s+key\\b',
    ],
    message: 'Use "select" to describe pressing a key, not "%s" (Microsoft).',
    link: 'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/h/hit',
    ignoreCase: true,
  });

  // Bare "check" and "deselect" are not included: "check" has too many other meanings,
  // and the replacement for "deselect" depends on the control.
  rules['microsoft/checkbox-verbs'] = swapRule({
    pairs: { uncheck: 'clear', unmark: 'clear', unselect: 'clear' },
    message: 'Use "%s" instead of "%s" for checkboxes (Microsoft).',
    link: DESCRIBING_UI,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['microsoft/dialog-terminology'] = swapRule({
    pairs: {
      'pop-up window': 'dialog',
      'dialog box': 'dialog',
      'dialogue box': 'dialog',
    },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: FORMATTING_TEXT_IN_INSTRUCTIONS,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // The link slug really is `mouse-mouse-interaction-terms`.
  rules['microsoft/mouse-over'] = swapRule({
    pairs: { 'mouse over': 'hover over' },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: 'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/term-collections/mouse-mouse-interaction-terms',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['microsoft/keyboard-shortcut-plus-spacing'] = patternRule({
    tokens: ['\\b(?:Ctrl|Alt|Shift|Cmd)\\s+\\+\\s+'],
    message: 'Don\'t put a space around "+" in a keyboard shortcut (Microsoft): "%s"',
    link: FORMATTING_TEXT_IN_INSTRUCTIONS,
  });

  rules['microsoft/sign-in-sign-out'] = swapRule({
    pairs: {
      'log into': 'sign in to',
      'log onto': 'sign in to',
      'log in': 'sign in',
      login: 'sign in',
      'log on': 'sign in',
      logon: 'sign in',
      'log off': 'sign out',
      'log out': 'sign out',
      logout: 'sign out',
      'sign into': 'sign in to',
      signin: 'sign in',
      'sign off': 'sign out',
    },
    message:
      'Rewrite "%s" as "%s" (Microsoft): "login"/"logon" as a noun needs a sentence rewrite.',
    link: 'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/l/log-on-log-off',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // Rules never fix, even if a swap sets `fix`.
  for (const rule of Object.values(rules)) {
    rule.fix = false;
  }

  return rules;
}
