import { describe, expect, it } from 'vitest';

import { lintContent } from '../../index.js';
import { pattern } from '../../rules/scope/pattern.js';
import type { ScopeRuleContext } from '../../rules/types.js';
import type { NormalizedRule, PatternAssertion } from '../../types/index.js';
import { presets } from '../presets/index.js';
import { unreportedPairs } from './swap-pair-coverage.js';

// Regex keys (`keysAreRegex`) need literal trigger text, for example `vs.` for `\bvs\.`. A regex key
// without an entry fails the test and is named.
const REGEX_KEY_EXAMPLES: Record<string, Record<string, string>> = {
  'microsoft/versus-in-text': {
    '\\bvs\\.': 'vs.',
  },
  'microsoft/us-spelling': {
    '\\bcentred\\b': 'centred',
    '\\bcentring\\b': 'centring',
    '\\bcatalogued\\b': 'catalogued',
    '\\bcataloguing\\b': 'cataloguing',
    '\\bcancelled\\b': 'cancelled',
    '\\bcancelling\\b': 'cancelling',
    '\\bfavourite\\b': 'favourite',
    '\\bauthorise\\b': 'authorise',
    '\\bauthorises\\b': 'authorises',
    '\\bauthorised\\b': 'authorised',
    '\\bauthorising\\b': 'authorising',
    '\\bauthorisation\\b': 'authorisation',
    '\\bcustomise\\b': 'customise',
    '\\bcustomises\\b': 'customises',
    '\\bcustomised\\b': 'customised',
    '\\bcustomising\\b': 'customising',
    '\\bcustomisation\\b': 'customisation',
    '\\blabelled\\b': 'labelled',
    '\\blabelling\\b': 'labelling',
    '\\bmodelled\\b': 'modelled',
    '\\bmodelling\\b': 'modelling',
  },
  'microsoft/us-spelling-detect': {
    '\\bcentre\\b': 'centre',
    '\\bcentres\\b': 'centres',
    '\\bcatalogue\\b': 'catalogue',
    '\\bcatalogues\\b': 'catalogues',
  },
  'microsoft/no-latin-abbreviations': {
    '\\be\\.g\\.,?': 'e.g.',
    '\\bi\\.e\\.,?': 'i.e.',
    '\\bviz\\.': 'viz.',
    '\\bergo\\b': 'ergo',
  },
  'microsoft/az-geography': {
    '\\bFar East\\b': 'Far East',
  },
  'microsoft/the-ask': {
    '\\bthe ask\\b(?!\\s+(?:tick|ticks|price|prices|spread|spreads|size|quote|quotes)\\b)':
      'the ask',
  },
  'microsoft/bias-free-terms': {
    '\\bDMZ\\b(?!\\s+(?:dividing|between|separating)\\b)': 'DMZ',
  },
  'microsoft/usa-abbreviation': {
    '\\bUSA\\b': 'USA',
    '\\bU\\.S\\.A\\.': 'U.S.A.',
    '\\bU\\.S\\.': 'U.S.',
  },
  'microsoft/simple-words': {
    '\\butilize\\b': 'utilize',
    '\\butilise\\b': 'utilise',
    '\\bmake use of\\b': 'make use of',
    '\\bin order to\\b': 'in order to',
    '\\bas a means to\\b': 'as a means to',
    '\\bin addition\\b(?!\\s+to\\b)': 'in addition',
    '\\bestablish connectivity\\b': 'establish connectivity',
    '\\binform\\b': 'inform',
  },
  'microsoft/az-state-failure': {
    '\\bhangs\\b(?!\\s+(?:on|up|around|out|together|of|in|tight|loose|fire|from|over)\\b)': 'hangs',
    '\\bhang\\b(?!\\s+(?:on|up|around|out|together|of|in|tight|loose|fire|from|over)\\b)': 'hang',
  },
  'microsoft/az-lifecycle-verbs': {
    '\\bcarry out\\b': 'carry out',
    '(?<!\\b(?:the|an|no|emergency)\\s)\\bexit\\b(?!\\s+(?:code|status|button|sign|strategy|interview|poll|ramp|velocity|row)\\b)':
      'exit',
    '(?<!\\b(?:product|software|game|website|app|feature|rocket|mission)\\s)\\blaunch\\b(?!\\s+(?:date|event|party|window|site|pad|day|plan|schedule|announcement)\\b)':
      'launch',
    '\\bboot\\b(?!\\s+(?:disk|sector|loader|sequence|process|time|options?|record|partition|menu|order|camera)\\b)':
      'boot',
    '\\bundelete\\b': 'undelete',
    '\\binstantiate\\b': 'instantiate',
    '\\biconize\\b': 'iconize',
  },
  'microsoft/az-judgment-words': {
    '\\bfinalize\\b': 'finalize',
    '\\bbug fix\\b': 'bug fix',
    '\\bbeta\\b(?!\\s+(?:distribution|function|coefficient|particle|blocker|decay)\\b)': 'beta',
    '\\bEULA\\b': 'EULA',
    '\\bEnd-User License Agreement\\b': 'End-User License Agreement',
  },
  'microsoft/az-ui-nouns': {
    '\\bblade\\b(?!\\s+(?:server|servers|enclosure|chassis|centers?|centres?)\\b)': 'blade',
    '\\binsertion point\\b': 'insertion point',
  },
  'microsoft/az-typography': {
    '\\btypeface\\b': 'typeface',
    '\\btype style\\b': 'type style',
    '\\bbolded\\b': 'bolded',
    '\\bboldface\\b': 'boldface',
    '\\broman\\b(?!\\s+(?:numeral|numerals|empire|alphabet|calendar|law|catholic|republic|mythology|god|gods|ruins?|coins?|holiday|road|roads|bath|baths|army|legion|forum|senate|aqueduct)\\b)':
      'roman',
  },
  'microsoft/az-navigation': {
    '\\bhot link\\b': 'hot link',
  },
  'microsoft/az-real-replacements': {
    '\\bfriendly name\\b': 'friendly name',
    '\\bprint queue\\b': 'print queue',
    '\\bprinter queue\\b': 'printer queue',
    '\\bdata record\\b': 'data record',
    '\\be-form\\b': 'e-form',
    '\\bupsize\\b': 'upsize',
    '\\bworking memory\\b': 'working memory',
    '\\bsoft copy\\b': 'soft copy',
    '(?<!\\b(?:a|an|the|this|that|your|my|its|his|her|their|our)\\s)\\bprint out\\b(?!\\s+of\\b)':
      'print out',
    '\\bsearch and replace\\b': 'search and replace',
    '\\btarget drive\\b': 'target drive',
    '\\btarget file\\b': 'target file',
  },
  'microsoft/az-filesystem': {
    '\\bhome directory\\b(?!\\s+for\\s+(?:its|the|your|his|her|their)?\\s*config)':
      'home directory',
  },
  'microsoft/az-abbreviations-substitutions': {
    '(?<!\\bon\\s)\\bspec\\b': 'spec',
  },
  'microsoft/spelling-hyphenation': {
    '\\be-?mail\\b(?<!email)': 'e-mail',
    '\\bdata ?base\\b(?<!database)': 'data base',
    '\\bend ?point\\b(?<!endpoint)': 'end point',
    '\\bweb ?site\\b(?<!website)': 'web site',
    '\\bweb ?page\\b(?<!webpage)': 'web page',
    '\\bwork ?station\\b(?<!workstation)': 'work station',
    '\\bscreen ?shot\\b(?<!screenshot)': 'screen shot',
    '\\btask ?bar\\b(?<!taskbar)': 'task bar',
    '\\bname ?space\\b(?<!namespace)': 'name space',
    '\\bplug-in\\b': 'plug-in',
    '\\becommerce\\b': 'ecommerce',
    '\\belearning\\b': 'elearning',
    '\\bebook\\b': 'ebook',
    '\\bcyber-security\\b': 'cyber-security',
    '\\bco-author\\b': 'co-author',
    '\\bdial ?up\\b': 'dial up',
    '\\bread only\\b': 'read only',
    '\\bcontext sensitive\\b': 'context sensitive',
    '\\bsingle sign ?on\\b': 'single sign on',
    '\\bmulti-factor\\b': 'multi-factor',
    '\\bmulti-cloud\\b': 'multi-cloud',
    '\\bmulti-tenant\\b': 'multi-tenant',
    '\\bwell-being\\b': 'well-being',
    '\\btool ?tip\\b(?<!tooltip)': 'tool tip',
    '\\bimbed\\b': 'imbed',
  },
  'microsoft/no-click': {
    '(?<![\\w-])click(?![a-zA-Z])(?!\\s+(?:count|counts|rate|rates|event|events|tracking|data|metrics?|history|id|ids|per)\\b)':
      'click',
    '(?<![\\w-])clicks(?![a-zA-Z])(?!\\s+(?:count|counts|rate|rates|event|events|tracking|data|metrics?|history|per)\\b)':
      'clicks',
    '(?<![\\w-])clicking(?![a-zA-Z])': 'clicking',
    '(?<![\\w-])clicked(?![a-zA-Z])': 'clicked',
  },
};

describe('recheck/microsoft per-pair coverage', () => {
  it('every swap and consistency pair in the preset fires at least once', async () => {
    expect(await unreportedPairs('recheck/microsoft', REGEX_KEY_EXAMPLES)).toEqual([]);
  });
});

// Checks every token of the `pattern` rules, not only that each rule fires once. The loop reads the
// live preset and requires an entry for every `pattern` rule, so a new rule or a removed token fails
// the test. Each example is registered by its exact token string, so a changed token fails too.

const PATTERN_TOKEN_EXAMPLES: Record<string, Record<string, string>> = {
  'microsoft/capitalize-after-heading-colon': {
    ':\\s+[a-z]': ': q',
  },
  'microsoft/no-ampersand-in-headings': {
    '&(?!amp;|nbsp;|lt;|gt;|quot;|#)': '&',
    '\\+': '+',
  },
  'microsoft/no-apostrophe-plural-decade': {
    "\\b(?:19|20)\\d0['\u2019]s\\b": "1990's",
  },
  'microsoft/no-trailing-conjunction-list': {
    '[,;]$': ',',
    '\\b(?:and|or)$': 'and',
  },
  'microsoft/no-ellipsis-column-header': {
    '(?:\\.\\.\\.|\u2026)$': '...',
  },
  'microsoft/no-blank-table-cell': {
    '^\\s*(?:\u2014\\s*)?$': '\u2014',
  },
  'microsoft/single-space-after-punctuation': {
    '[.!?:]\\s{2,}(?=[A-Z])': '.  ',
  },
  'microsoft/no-space-around-em-dash': {
    '\\s\u2014\\s': ' \u2014 ',
  },
  'microsoft/no-from-before-en-dash-range': {
    '\\bfrom\\s+\\d+\\s*[\u2013\u2014]\\s*\\d+': 'from 10\u201320',
  },
  'microsoft/spell-out-ordinals': {
    '\\b\\d+(?:st|nd|rd|th)\\b': '21st',
  },
  'microsoft/noon-midnight': {
    '\\b12:00\\s*(?:AM|PM|am|pm)\\b': '12:00 PM',
  },
  'microsoft/alt-text-generic-opener': {
    '^(?:Image|Icon|Graphic|Button|Link)\\b': 'Image',
  },
  'microsoft/alt-text-no-filename': {
    '\\.(?:png|jpe?g|gif|svg|webp)$': '.png',
  },
  'microsoft/no-awkward-contractions': {
    "\\b(?:there['\u2019]d|it['\u2019]ll|they['\u2019]d|that['\u2019]ll|there['\u2019]ll)\\b":
      "there'd",
  },
  'microsoft/no-weak-phrasing': {
    '\\bthere (?:is|are|was|were)\\b': 'there is',
  },
  'microsoft/avoid-please': {
    '\\bplease\\b': 'please',
  },
  'microsoft/impact-verb': {
    '\\bimpact(?:s|ed|ing)?\\s+(?:performance|productivity|quality|reliability|availability|latency|throughput)\\b':
      'impacts performance',
  },
  'microsoft/no-derogatory-slang': {
    '\\bpimp\\b': 'pimp',
    '\\bbitch\\b': 'bitch',
    '\\bspirit animal\\b': 'spirit animal',
  },
  'microsoft/accessibility-terms': {
    '\\bcrippled\\b': 'crippled',
    '\\bhandicapped\\b': 'handicapped',
    '\\bthe handicapped\\b': 'the handicapped',
    '\\bpeople with handicaps\\b': 'people with handicaps',
    '\\bslow learner\\b': 'slow learner',
    '\\bmentally handicapped\\b': 'mentally handicapped',
    '\\bdifferently abled\\b': 'differently abled',
    '\\bspecial needs\\b': 'special needs',
    '\\baffected by\\b': 'affected by',
    '\\bstricken with\\b': 'stricken with',
    '\\bsuffers from\\b': 'suffers from',
    '\\ba victim of\\b': 'a victim of',
    '\\bsight-impaired\\b': 'sight-impaired',
    '\\bvision-impaired\\b': 'vision-impaired',
    '\\bhearing-impaired\\b': 'hearing-impaired',
    '\\bnon-verbal\\b': 'non-verbal',
    '\\bmaimed\\b': 'maimed',
    '\\bmissing a limb\\b': 'missing a limb',
    '\\bbirth defect\\b': 'birth defect',
    '\\bSpecial Ed person\\b': 'Special Ed person',
    '\\bnormal person\\b': 'normal person',
    '\\bhealthy person\\b': 'healthy person',
    "\\bAsperger['\u2019]s\\b": "Asperger's",
    '\\bdumb\\b': 'dumb',
    '\\b(?:is|was|are|were|being|been)\\s+mute\\b': 'is mute',
    '\\bdeaf and mute\\b': 'deaf and mute',
    '\\bdeaf-mute\\b': 'deaf-mute',
    '\\blame\\b': 'lame',
    '\\bstupid\\b': 'stupid',
    '\\ban epileptic\\b(?!\\s+(?:seizure|episode|fit|attack|event))': 'an epileptic',
  },
  'microsoft/actionable': {
    '\\bactionable\\b': 'actionable',
  },
  'microsoft/master-slave': {
    '\\bmaster\\s*/\\s*slave\\b': 'master/slave',
    '\\bmaster-slave\\b': 'master-slave',
  },
  'microsoft/az-no-replacement': {
    '\\bblack box\\b': 'black box',
    '\\bdot-com\\b': 'dot-com',
    '\\bedutainment\\b': 'edutainment',
    '\\bhoneypot\\b': 'honeypot',
    '\\bbackbone\\b': 'backbone',
    '\\bwordwrap\\b': 'wordwrap',
    '\\bnatural user interface\\b': 'natural user interface',
    '\\bNUI\\b': 'NUI',
    '\\bsubaddress\\b': 'subaddress',
  },
  'microsoft/press-key-verb': {
    '\\b(?:press|hit|strike)\\s+(?:the\\s+)?(?:Enter|Tab|Esc|Escape|Delete|Backspace|spacebar|Ctrl|Shift|Alt)\\b':
      'press Enter',
    '\\b(?:press|hit|strike)\\s+the\\s+\\S+\\s+key\\b': 'press the Tab key',
  },
  'microsoft/keyboard-shortcut-plus-spacing': {
    '\\b(?:Ctrl|Alt|Shift|Cmd)\\s+\\+\\s+': 'Ctrl + ',
  },
  'microsoft/az-state-failure-detect': {
    '\\bcrash\\b(?!\\s+(?:dump|report|log|course|test|site)\\b)': 'crash',
    '\\block up\\b': 'lock up',
  },
  'microsoft/az-lifecycle-verbs-detect': {
    '\\bquit\\b': 'quit',
    '\\bdeinstall\\b': 'deinstall',
    '\\breinitialize\\b': 'reinitialize',
  },
  'microsoft/az-geography-detect': {
    '\\bthank you\\b': 'thank you',
  },
  'microsoft/az-direction-layout-detect': {
    '\\bbottom left\\b': 'bottom left',
    '\\bbottom right\\b': 'bottom right',
  },
  'microsoft/az-ui-nouns-detect': {
    '\\bhierarchical menu\\b': 'hierarchical menu',
    '\\bsecondary menu\\b': 'secondary menu',
    '\\brunning head\\b': 'running head',
    '\\brunning foot\\b': 'running foot',
  },
  'microsoft/italic-as-noun': {
    '\\bitalics\\b': 'italics',
    '\\bitalicized\\b': 'italicized',
  },
  'microsoft/az-abbreviations-names-detect': {
    '\\bpound sign\\b': 'pound sign',
  },
  'microsoft/az-grammar-usage-detect': {
    '\\bas well as\\b': 'as well as',
    '\\bor greater\\b': 'or greater',
    '\\bor higher\\b': 'or higher',
    '\\bor lower\\b': 'or lower',
  },
  'microsoft/no-latin-abbreviations-detect': {
    '\\bde facto\\b': 'de facto',
    '\\bad hoc\\b': 'ad hoc',
    '\\bvis-[\u00e0a]-vis\\b': 'vis-a-vis',
  },
  'microsoft/az-navigation-detect': {
    '\\bvisit\\b(?!\\s+(?:count|counts|duration|frequency|history|log|data)\\b)': 'visit',
  },
};

// Overrides for tokens that do not fit the paragraph wrapper below (heading-only scope, list-item,
// table or alt scope, or text that needs specific surrounding characters). Keyed by
// `${ruleName}\u0000${token}`.
const CUSTOM_TOKEN_BLOCKS: Record<string, (index: number) => string> = {
  'microsoft/capitalize-after-heading-colon\u0000:\\s+[a-z]': (i) =>
    `## Coverage heading ${i}: quick reference`,
  'microsoft/no-ampersand-in-headings\u0000&(?!amp;|nbsp;|lt;|gt;|quot;|#)': (i) =>
    `## Coverage heading ${i} for logging & monitoring`,
  'microsoft/no-ampersand-in-headings\u0000\\+': (i) =>
    `## Coverage heading ${i} for shortcuts + tips`,
  'microsoft/no-trailing-conjunction-list\u0000[,;]$': (i) =>
    `- Coverage list item ${i} ending with a comma,`,
  'microsoft/no-trailing-conjunction-list\u0000\\b(?:and|or)$': (i) =>
    `- Coverage list item ${i} ending with the word and`,
  'microsoft/no-ellipsis-column-header\u0000(?:\\.\\.\\.|\u2026)$': (i) =>
    `| Coverage header ${i}... | Description |\n| --- | --- |\n| name | value |`,
  'microsoft/no-blank-table-cell\u0000^\\s*(?:\u2014\\s*)?$': () =>
    `| Field | Description |\n| --- | --- |\n| name | \u2014 |`,
  'microsoft/single-space-after-punctuation\u0000[.!?:]\\s{2,}(?=[A-Z])': (i) =>
    `Coverage sentence ${i} ends here.  Next sentence starts here.`,
  'microsoft/no-space-around-em-dash\u0000\\s\u2014\\s': (i) =>
    `Coverage sentence ${i} uses a spaced \u2014 em dash here.`,
  'microsoft/alt-text-generic-opener\u0000^(?:Image|Icon|Graphic|Button|Link)\\b': (i) =>
    `![Image of a coverage diagram ${i}](https://example.com/coverage-${i}.png)`,
  'microsoft/alt-text-no-filename\u0000\\.(?:png|jpe?g|gif|svg|webp)$': (i) =>
    `![Coverage diagram file name ${i}.png](https://example.com/coverage-${i}.png)`,
  'microsoft/keyboard-shortcut-plus-spacing\u0000\\b(?:Ctrl|Alt|Shift|Cmd)\\s+\\+\\s+': (i) =>
    `Coverage sentence ${i}: press Ctrl + C to copy the selection.`,
};

describe('recheck/microsoft preset per-pair coverage (pattern tokens)', () => {
  it('every pattern token in the live preset has a registered example, and every token fires at least once', async () => {
    const preset = presets['recheck/microsoft'];
    const missing: string[] = [];
    const blocks: string[] = [];
    const expectations: Array<{ ruleName: string; token: string; example: string }> = [];
    let index = 0;

    // Loop over the live preset's `pattern` rules. A rule with no entry in the map below fails the test.
    for (const [ruleName, rule] of Object.entries(preset)) {
      const patternOptions = rule.assertions?.['pattern'] as PatternAssertion | undefined;
      if (!patternOptions?.tokens) continue;

      const examples = PATTERN_TOKEN_EXAMPLES[ruleName];
      if (!examples) {
        missing.push(
          `${ruleName}: ships a pattern assertion with ${patternOptions.tokens.length} token(s) but has NO entry in PATTERN_TOKEN_EXAMPLES`
        );
        continue;
      }

      const liveTokens = new Set(patternOptions.tokens);
      const registeredTokens = new Set(Object.keys(examples));

      for (const token of liveTokens) {
        if (!registeredTokens.has(token)) {
          missing.push(
            `${ruleName}: live token ${JSON.stringify(token)} has no registered example`
          );
        }
      }
      for (const token of registeredTokens) {
        if (!liveTokens.has(token)) {
          missing.push(
            `${ruleName}: registered example for ${JSON.stringify(token)} no longer matches any live token (stale entry)`
          );
        }
      }

      for (const [token, example] of Object.entries(examples)) {
        expectations.push({ ruleName, token, example });
        index += 1;
        const customBlock = CUSTOM_TOKEN_BLOCKS[`${ruleName}\u0000${token}`];
        blocks.push(
          customBlock
            ? customBlock(index)
            : `Coverage case ${index}: sample text with ${example} inside it.`
        );
      }
    }

    // A rule with no examples, or a token list that changed without updating the map, fails here.
    expect(missing).toEqual([]);
    expect(expectations.length).toBeGreaterThanOrEqual(67);

    const doc = ['# Pattern token coverage', '', blocks.join('\n\n')].join('\n');
    const problems = await lintContent(doc, { extends: ['recheck/microsoft'] });
    const reportedByRule = new Map<string, Set<string>>();
    for (const p of problems) {
      let matched = reportedByRule.get(p.ruleName);
      if (!matched) {
        matched = new Set();
        reportedByRule.set(p.ruleName, matched);
      }
      matched.add(p.match.toLowerCase());
    }

    const notReported: string[] = [];
    for (const { ruleName, token, example } of expectations) {
      const matches = reportedByRule.get(ruleName);
      if (!matches || !matches.has(example.toLowerCase())) {
        notReported.push(
          `${ruleName}: token ${JSON.stringify(token)} (trigger text ${JSON.stringify(example)}) was never reported`
        );
      }
    }
    expect(notReported).toEqual([]);
  });
});

// `microsoft/no-blank-table-cell` only reports the em dash case, because a `pattern` token cannot
// match an empty cell. These tests check that the em dash still fires, a real blank cell does not,
// and the token stays fast on a long whitespace-only cell.
describe('recheck/microsoft no-blank-table-cell: narrowed to em-dash only (Item 3)', () => {
  it('still reports a cell containing exactly an em dash', async () => {
    const doc = '| Field | Description |\n| --- | --- |\n| name | — |\n';
    const problems = await lintContent(doc, { extends: ['recheck/microsoft'] });
    const matches = problems.filter((p) => p.ruleName === 'microsoft/no-blank-table-cell');
    expect(matches).toHaveLength(1);
    expect(matches[0].match).toBe('—');
  });

  // A cell with no content between the pipes is not reported, because a `pattern` token cannot match
  // an empty string.
  it('does NOT report a genuinely blank cell (empty content between the pipes)', async () => {
    const doc = '| Field | Description |\n| --- | --- |\n| name |  |\n';
    const problems = await lintContent(doc, { extends: ['recheck/microsoft'] });
    const matches = problems.filter((p) => p.ruleName === 'microsoft/no-blank-table-cell');
    expect(matches).toEqual([]);
  });

  it('does NOT report a whitespace-only cell either (trims to the same empty content)', async () => {
    const doc = '| Field | Description |\n| --- | --- |\n| name |     |\n';
    const problems = await lintContent(doc, { extends: ['recheck/microsoft'] });
    const matches = problems.filter((p) => p.ruleName === 'microsoft/no-blank-table-cell');
    expect(matches).toEqual([]);
  });

  // Runs `pattern.execute()` directly on 32KB of whitespace followed by `x`, which never matches
  // `^\s*(?:—\s*)?$`. The old token `^\s*(?:—)?\s*$` took over 600ms on this input.
  it('the live token completes in linear time on a 32KB non-matching whitespace run (no quadratic backtracking)', async () => {
    const rule: NormalizedRule = {
      ...presets['recheck/microsoft']['microsoft/no-blank-table-cell'],
      name: 'microsoft/no-blank-table-cell',
      shortName: 'microsoft/no-blank-table-cell',
    };
    const content = `${' '.repeat(32 * 1024)}x`;
    const ctx: ScopeRuleContext = {
      segments: [
        {
          scope: 'table.cell',
          content,
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: content.length + 1,
          tokens: [],
        },
      ],
      content,
      tree: { children: [], flat: [] },
    };

    const start = performance.now();
    const problems = await pattern.execute(rule, 'test.md', ctx);
    const elapsed = performance.now() - start;

    // There is no match either way. This test measures time, not findings.
    expect(problems).toEqual([]);
    expect(elapsed).toBeLessThan(100);
  });
});

// Words that no rule in this preset targets (see PROVENANCE.md, "Excluded candidates"). Edits must
// not start matching them.

describe('recheck/microsoft collision probes: words no rule targets stay clean', () => {
  const probes: string[] = [
    'Mute the audio track before recording.\n',
    'The response follows a normal distribution.\n',
    'The device can detect an epileptic seizure.\n',
    'See the x-axis label for the unit of measure.\n',
    'The report includes an x-ray image of the scan.\n',
    'The feature ships in May 2026.\n',
    'The expression uses + in prose without spacing issues.\n',
    'The report that follows describes the incident.\n',
    'The dashboard shows a star next to the featured item.\n',
  ];

  it.each(probes)('reports nothing for %j', async (content) => {
    const problems = await lintContent(content, { extends: ['recheck/microsoft'] });
    expect(problems).toEqual([]);
  });
});
