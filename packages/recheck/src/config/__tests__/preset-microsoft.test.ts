import { readFile } from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { runRulesUntilStable } from '../../core/runner.js';
import { lintContent } from '../../index.js';
import { pattern } from '../../rules/scope/pattern.js';
import type { ScopeRuleContext } from '../../rules/types.js';
import type {
  ConsistencyAssertion,
  NormalizedRule,
  PatternAssertion,
  SwapAssertion,
} from '../../types/index.js';
import { presets } from '../presets/index.js';
import { validate } from '../validate.js';

// The rule keys here are `microsoft/<rule>`, not `recheck/<rule>`, so `shortName` equals the full key.
describe('recheck/microsoft preset namespace', () => {
  it('every rule key in the preset is namespaced microsoft/<rule>, not recheck/<rule>', () => {
    const keys = Object.keys(presets['recheck/microsoft']);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key.startsWith('microsoft/'), `expected "${key}" to start with "microsoft/"`).toBe(
        true
      );
    }
  });
});

// No rule may be fixable. This reads the live preset, so a new rule cannot bring fixing back.
describe('recheck/microsoft preset is detection-only (Step 1 permanent guarantee)', () => {
  it('no rule in the live preset is fixable', () => {
    const preset = presets['recheck/microsoft'];
    const stillFixable = Object.entries(preset)
      .filter(([, rule]) => rule.fix !== false)
      .map(([name]) => name);
    expect(stillFixable).toEqual([]);
  });

  it('sanity: the preset has more than a handful of rules, so the guarantee above is non-trivial', () => {
    expect(Object.keys(presets['recheck/microsoft']).length).toBeGreaterThan(50);
  });
});

const dir = path.dirname(fileURLToPath(import.meta.url));
function fixture(name: string): string {
  return path.join(dir, 'fixtures', name);
}

describe('recheck/microsoft preset fixtures', () => {
  // A rule that ships but can never fire would go unnoticed otherwise.
  it('reports every rule the preset ships', async () => {
    const violations = await readFile(fixture('microsoft-violations.md'), 'utf8');
    const problems = await lintContent(violations, { extends: ['recheck/microsoft'] });
    const reported = new Set(problems.map((p) => p.ruleName));
    const shipped = new Set(Object.keys(presets['recheck/microsoft']));
    expect([...shipped].filter((r) => !reported.has(r))).toEqual([]);
  });

  // Compliant prose, including the guide's own approved examples, must produce no findings.
  it("reports nothing on compliant prose, including the guide's own approved examples", async () => {
    const md = await readFile(fixture('microsoft-clean.md'), 'utf8');
    const problems = await lintContent(md, { extends: ['recheck/microsoft'] });
    expect(problems).toEqual([]);
  });
});

// Checks every swap pair, not only every rule. The trigger document is built from the live preset,
// so it follows added or removed pairs.

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

// Some keys of a `keysAreRegex` rule are plain text (for example `click on`). Only keys with regex
// syntax need an entry above.
const RAW_REGEX_SYNTAX = /[\\()?!^$|{}[\]]/;

interface CoverageCase {
  ruleName: string;
  /** The raw config key, as shown in failure messages. */
  configKey: string;
  /** The literal text to put in the document and find in the reported `match`. */
  example: string;
  /** `consistency` only: a variant placed earlier in the document, so `example` is the one reported. */
  preamble?: string;
  /** True when the rule only looks at headings, so the trigger text must be in a heading line. */
  headingOnly?: boolean;
}

describe('recheck/microsoft preset per-pair coverage', () => {
  it('every swap/consistency pair key in the preset fires at least once', async () => {
    const preset = presets['recheck/microsoft'];
    const cases: CoverageCase[] = [];
    const missingExamples: string[] = [];

    for (const [ruleName, rule] of Object.entries(preset)) {
      const headingOnly = rule.scope === 'heading';
      const swapOptions = rule.assertions?.['swap'] as SwapAssertion | undefined;
      if (swapOptions?.pairs) {
        for (const key of Object.keys(swapOptions.pairs)) {
          const registeredExample = REGEX_KEY_EXAMPLES[ruleName]?.[key];
          if (registeredExample !== undefined) {
            cases.push({ ruleName, configKey: key, example: registeredExample, headingOnly });
          } else if (swapOptions.keysAreRegex && RAW_REGEX_SYNTAX.test(key)) {
            missingExamples.push(
              `${ruleName}: no REGEX_KEY_EXAMPLES trigger text registered for regex key ${JSON.stringify(key)}`
            );
          } else {
            cases.push({ ruleName, configKey: key, example: key, headingOnly });
          }
        }
      }

      const consistencyOptions = rule.assertions?.['consistency'] as
        | ConsistencyAssertion
        | undefined;
      if (consistencyOptions?.either) {
        for (const [key, value] of Object.entries(consistencyOptions.either)) {
          cases.push({ ruleName, configKey: key, example: key, preamble: String(value) });
        }
      }
    }

    // A regex key without an example fails here, with the key named.
    expect(missingExamples).toEqual([]);
    expect(cases.length).toBeGreaterThan(150);

    // One paragraph per case, plus an earlier paragraph for `consistency` cases, so trigger texts cannot
    // overlap. `headingOnly` cases go in a heading line, because heading rules never see paragraph text.
    const blocks: string[] = [];
    cases.forEach((c, i) => {
      if (c.preamble !== undefined) {
        blocks.push(`Coverage preamble ${i}: sample text with ${c.preamble} inside it.`);
      }
      blocks.push(
        c.headingOnly
          ? `## Coverage case ${i} with ${c.example} inside it`
          : `Coverage case ${i}: sample text with ${c.example} inside it.`
      );
    });
    const doc = ['# Per-pair coverage', '', blocks.join('\n\n')].join('\n');

    const problems = await lintContent(doc, { extends: ['recheck/microsoft'] });
    const reportedByRule = new Map<string, Set<string>>();
    for (const p of problems) {
      let matchedTexts = reportedByRule.get(p.ruleName);
      if (!matchedTexts) {
        matchedTexts = new Set();
        reportedByRule.set(p.ruleName, matchedTexts);
      }
      matchedTexts.add(p.match.toLowerCase());
    }

    const notReported: string[] = [];
    for (const { ruleName, configKey, example } of cases) {
      const matches = reportedByRule.get(ruleName);
      if (!matches || !matches.has(example.toLowerCase())) {
        notReported.push(
          `${ruleName}: pair ${JSON.stringify(configKey)} (trigger text ${JSON.stringify(example)}) was never reported`
        );
      }
    }
    expect(notReported).toEqual([]);
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

// Runs fixes until the text stops changing, like the CLI's `--fix`. Each case below must stay
// unchanged and must still be reported.
async function fixTwice(content: string) {
  const { rules } = await validate({ extends: ['recheck/microsoft'] });
  const pass1 = await runRulesUntilStable([{ path: 'x.md', content }], rules);
  const afterPass1 = pass1.fixedFiles.get('x.md') ?? content;
  const pass2 = await runRulesUntilStable([{ path: 'x.md', content: afterPass1 }], rules);
  const afterPass2 = pass2.fixedFiles.get('x.md') ?? afterPass1;
  return { afterPass1, afterPass2 };
}

describe('recheck/microsoft preset fix safety (now: detection-only, nothing ever rewrites)', () => {
  it('is idempotent: running --fix twice on the violations fixture converges (second pass changes nothing further) -- trivially true now that no rule fixes at all, but still a real regression guard against a future rule un-disabling fixing without idempotency', async () => {
    const violations = await readFile(fixture('microsoft-violations.md'), 'utf8');
    const { afterPass1, afterPass2 } = await fixTwice(violations);
    expect(afterPass2).toBe(afterPass1);
  });

  it('CASE-ONLY pairs (az-case-only) never fix, and fixing does not change the file', async () => {
    const content = 'Configure access to the Internet before you continue.\n';
    const { afterPass1 } = await fixTwice(content);
    expect(afterPass1).toBe(content);
  });

  it('VERB-ABLE pairs (az-verb-able) never fix, and fixing does not change the file', async () => {
    const content = 'Add the domain to the whitelist to allow it.\n';
    const { afterPass1 } = await fixTwice(content);
    expect(afterPass1).toBe(content);
  });

  // `tooltip-capitalization` only detects, so `--fix`, run twice, must leave the violation unchanged.
  it('tooltip-capitalization no longer rewrites "ToolTip" to "tooltip", but still detects it', async () => {
    const content = 'Hover over the ToolTip to see more details.\n';
    const { afterPass1, afterPass2 } = await fixTwice(content);
    expect(afterPass1).toBe(content);
    expect(afterPass2).toBe(afterPass1);

    const problems = await lintContent(content, { extends: ['recheck/microsoft'] });
    expect(problems.some((p) => p.ruleName === 'microsoft/tooltip-capitalization')).toBe(true);
  });

  // `no-click` must not touch hyphenated compounds or the unrelated words "clickstream" and "clickthrough".
  it('no-click leaves double-click, right-click, clickstream, and clickthrough untouched', async () => {
    const content =
      'Double-click the icon, or right-click for more options. ' +
      'The dashboard reports clickstream and clickthrough data.\n';
    const { afterPass1, afterPass2 } = await fixTwice(content);
    expect(afterPass1).toBe(content);
    expect(afterPass2).toBe(afterPass1);
  });
});

// Phrases that were once rewritten wrongly, run through `--fix` twice (some problems only showed on
// the second pass). Each must stay unchanged.

describe('recheck/microsoft fix wave B: Step 3 (us-spelling inflections) no longer collapse', () => {
  // `us-spelling` only detects, so `--fix`, run twice, must leave each inflection unchanged while the
  // rule still reports it.
  const noLongerFixes: Array<[string, string]> = [
    ['The team is modelling the traffic pattern.\n', 'microsoft/us-spelling'],
    ['The job was cancelling when the timeout occurred.\n', 'microsoft/us-spelling'],
    ['The request was authorised by the admin.\n', 'microsoft/us-spelling'],
    ['Authorisation happens before the redirect.\n', 'microsoft/us-spelling'],
    ['Customisation of the theme is optional.\n', 'microsoft/us-spelling'],
    // `centre` and `catalogue` are in `microsoft/us-spelling-detect`, because "Centre County", "Bell
    // Centre" and "Catalogue of Life" are real names.
    ['Both centres report the same latency.\n', 'microsoft/us-spelling-detect'],
    ['The two catalogues are merged nightly.\n', 'microsoft/us-spelling-detect'],
  ];

  it.each(noLongerFixes)(
    'no longer rewrites %j, but still reports it against %s',
    async (content, ruleName) => {
      const { afterPass1, afterPass2 } = await fixTwice(content);
      expect(afterPass1).toBe(content);
      expect(afterPass2).toBe(afterPass1);
      const problems = await lintContent(content, { extends: ['recheck/microsoft'] });
      expect(problems.some((p) => p.ruleName === ruleName)).toBe(true);
    }
  );
});

describe('recheck/microsoft fix wave B: Step 4 corrupting pairs no longer rewrite correct prose', () => {
  // Each string is correct prose. `--fix`, run twice, must leave it unchanged.
  const unchanged: string[] = [
    'Mount the SMB share to access the network files.\n',
    'The exit code is 1 when the command fails.\n',
    'Attach the crash dump before filing a support ticket.\n',
    "Roman numerals aren't supported in this field.\n",
    'The product launch is scheduled for next quarter.\n',
    'Set the boot disk size before creating the virtual machine.\n',
    'The service hangs on to the connection until the client disconnects.\n',
    'Visit counts are aggregated per day for each endpoint.\n',
    'A blade server occupies one slot in the chassis.\n',
    'The beta distribution models the prior probability.\n',
    'In addition to the API key, you need a valid client ID.\n',
    'Keep a print out of the receipt for your records.\n',
    'Use italics for emphasis.\n',
    'Terminate the instance when the job finishes.\n',
    'The SKU field identifies the product variant.\n',
  ];

  it.each(unchanged)('leaves %j unchanged through two --fix passes', async (content) => {
    const { afterPass1, afterPass2 } = await fixTwice(content);
    expect(afterPass1).toBe(content);
    expect(afterPass2).toBe(afterPass1);
  });

  // These pairs replace a word with a different word, so they only detect. `--fix` must leave the
  // violation unchanged and the rule must still report it.
  const stillDetectsButNoLongerFixes: Array<[string, string]> = [
    ['Exit the application when you finish.\n', 'microsoft/az-lifecycle-verbs'],
    ['Launch the app to begin the tour.\n', 'microsoft/az-lifecycle-verbs'],
    ['Boot the device to apply the update.\n', 'microsoft/az-lifecycle-verbs'],
    ['Open the blade to configure additional settings.\n', 'microsoft/az-ui-nouns'],
    ['The beta program starts next week.\n', 'microsoft/az-judgment-words'],
    ['In addition, configure the timeout before you continue.\n', 'microsoft/simple-words'],
    ['Print out the report before the meeting.\n', 'microsoft/az-real-replacements'],
  ];

  it.each(stillDetectsButNoLongerFixes)(
    'no longer rewrites %j, but still reports it against %s',
    async (content, ruleName) => {
      const { afterPass1, afterPass2 } = await fixTwice(content);
      expect(afterPass1).toBe(content);
      expect(afterPass2).toBe(afterPass1);
      const problems = await lintContent(content, { extends: ['recheck/microsoft'] });
      expect(problems.some((p) => p.ruleName === ruleName)).toBe(true);
    }
  );
});

// Words that no rule in this preset targets (see PROVENANCE.md, "Excluded candidates"). Edits must
// not start matching them.

describe('recheck/microsoft fix wave B acceptance gate 2: collision probes stay clean', () => {
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

// These pairs only detect. The guide's quote warns against mixing terms, covers a narrower context,
// has an unrelated common meaning, or gives no single replacement. `--fix`, run twice, must leave each
// one unchanged.

describe('recheck/microsoft fix wave C: reclassified pairs no longer corrupt correct prose', () => {
  const unchanged: string[] = [
    'As well as being fast, the API is reliable.\n',
    'A score of 80 or higher is required to pass.\n',
    'A score of 80 or greater is required to pass.\n',
    'A score of 80 or lower fails the check.\n',
    'Financial leverage increased in the third quarter.\n',
    'The deal was structured as a leveraged buyout.\n',
    "It's OK to use glyph in a technical discussion of fonts and characters.\n",
    'Avoid de facto standards when an open specification exists.\n',
    'The team took an ad hoc approach to the migration.\n',
    'The report compares the two regions vis-a-vis their latency.\n',
    'Visit the product website to learn about offerings, get advice, and more.\n',
    'Schedule a visit with the account team before the renewal date.\n',
  ];

  it.each(unchanged)('leaves %j unchanged through two --fix passes', async (content) => {
    const { afterPass1, afterPass2 } = await fixTwice(content);
    expect(afterPass1).toBe(content);
    expect(afterPass2).toBe(afterPass1);
  });

  // Each pair must still report its genuine violation, so a rule that stopped rewriting did not also
  // stop detecting.
  const stillDetects: Array<[string, string]> = [
    ['As well as being fast, the API is reliable.\n', 'microsoft/az-grammar-usage-detect'],
    ['A score of 80 or higher is required to pass.\n', 'microsoft/az-grammar-usage-detect'],
    ['A score of 80 or greater is required to pass.\n', 'microsoft/az-grammar-usage-detect'],
    ['A score of 80 or lower fails the check.\n', 'microsoft/az-grammar-usage-detect'],
    ['Leverage the caching layer to reduce latency.\n', 'microsoft/leverage'],
    ["Don't use a glyph when a plain symbol will do.\n", 'microsoft/glyph'],
    [
      'Avoid de facto standards when an open specification exists.\n',
      'microsoft/no-latin-abbreviations-detect',
    ],
    [
      'The team took an ad hoc approach to the migration.\n',
      'microsoft/no-latin-abbreviations-detect',
    ],
    [
      'The report compares the two regions vis-a-vis their latency.\n',
      'microsoft/no-latin-abbreviations-detect',
    ],
    ['Please visit the dashboard for details.\n', 'microsoft/az-navigation-detect'],
  ];

  it.each(stillDetects)('still reports %j against %s', async (content, ruleName) => {
    const problems = await lintContent(content, { extends: ['recheck/microsoft'] });
    expect(problems.some((p) => p.ruleName === ruleName)).toBe(true);
  });
});

// Near-misses of already-anchored pairs must stay unchanged.

describe('recheck/microsoft fix wave C: anchor gaps closed without disabling genuine fixes', () => {
  const unchanged: string[] = [
    'Once you get the hang of the API, requests become second nature.\n',
    'Hang tight while we process your request.\n',
    'Keep the print out safe for your expense report.\n',
    'Attach the print out to the support ticket.\n',
    'The dashboard reports click count and click rate for each button.\n',
    'The analytics API returns clicks per session for the funnel.\n',
    'Write a SQL query to fetch the rows.\n',
  ];

  it.each(unchanged)('leaves %j unchanged through two --fix passes', async (content) => {
    const { afterPass1, afterPass2 } = await fixTwice(content);
    expect(afterPass1).toBe(content);
    expect(afterPass2).toBe(afterPass1);
  });

  // These pairs only detect: `--fix` must leave them unchanged and the rule must still report them.
  const stillDetectsButNoLongerFixes: Array<[string, string]> = [
    ['The application hangs when the request queue overflows.\n', 'microsoft/az-state-failure'],
    ['Print out the invoice before mailing it.\n', 'microsoft/az-real-replacements'],
    ['Click the button to continue.\n', 'microsoft/no-click'],
    ['Write an SQL query to fetch the rows.\n', 'microsoft/article-before-acronym'],
  ];

  it.each(stillDetectsButNoLongerFixes)(
    'no longer rewrites %j, but still reports it against %s',
    async (content, ruleName) => {
      const { afterPass1, afterPass2 } = await fixTwice(content);
      expect(afterPass1).toBe(content);
      expect(afterPass2).toBe(afterPass1);
      const problems = await lintContent(content, { extends: ['recheck/microsoft'] });
      expect(problems.some((p) => p.ruleName === ruleName)).toBe(true);
    }
  );
});

// Terms that can be part of a real organization, product or place name ("USA Gymnastics", "U.S.
// Bank", "Bell Centre", the `boolean` type keyword) must not be rewritten. `--fix`, run twice, must
// leave them unchanged and the rule must still report them.

describe('recheck/microsoft fix-posture wave 2: proper-noun axis', () => {
  const unchangedAndStillDetected: Array<[string, string]> = [
    ['The payment was processed by U.S. Bank on Tuesday.\n', 'microsoft/usa-abbreviation'],
    ['The USA Gymnastics team announced its roster.\n', 'microsoft/usa-abbreviation'],
    ['U.S.A. Track and Field sanctioned the meet.\n', 'microsoft/usa-abbreviation'],
    ['U.S. Steel announced closures.\n', 'microsoft/usa-abbreviation'],
    ['Both centres report the same latency.\n', 'microsoft/us-spelling-detect'],
    ['The two catalogues are merged nightly.\n', 'microsoft/us-spelling-detect'],
    ['The response field returns a boolean summary.\n', 'microsoft/az-case-fixable-detect'],
  ];

  it.each(unchangedAndStillDetected)(
    'leaves %j unchanged through two --fix passes, but still reports it against %s',
    async (content, ruleName) => {
      const { afterPass1, afterPass2 } = await fixTwice(content);
      expect(afterPass1).toBe(content);
      expect(afterPass2).toBe(afterPass1);
      const problems = await lintContent(content, { extends: ['recheck/microsoft'] });
      expect(problems.some((p) => p.ruleName === ruleName)).toBe(true);
    }
  );

  // The remaining pairs of `microsoft/us-spelling` and `microsoft/az-case-fixable` must still report,
  // so no rule is dead.
  it('microsoft/us-spelling no longer fixes a pair NOT moved to the proper-noun sibling, but still detects it', async () => {
    const content = 'The request was authorised by the admin.\n';
    const { afterPass1, afterPass2 } = await fixTwice(content);
    expect(afterPass1).toBe(content);
    expect(afterPass2).toBe(afterPass1);
    const problems = await lintContent(content, { extends: ['recheck/microsoft'] });
    expect(problems.some((p) => p.ruleName === 'microsoft/us-spelling')).toBe(true);
  });

  it('microsoft/az-case-fixable no longer fixes a pair NOT moved to the detect-only sibling, but still detects it', async () => {
    const content = 'The rollout uses Big Data to model demand.\n';
    const { afterPass1, afterPass2 } = await fixTwice(content);
    expect(afterPass1).toBe(content);
    expect(afterPass2).toBe(afterPass1);
    const problems = await lintContent(content, { extends: ['recheck/microsoft'] });
    expect(problems.some((p) => p.ruleName === 'microsoft/az-case-fixable')).toBe(true);
  });
});

// `microsoft/contraction-consistency` pairs "it's" with "it is", but "it's" can also mean "it has".
// The old fix turned "it's been growing" into "it is been growing". The engine now refuses such pairs,
// so this cannot happen even if a user turns fixing back on.

describe("consistency engine guard: the it's/it is corruption no longer reproduces", () => {
  it("with microsoft/use-contractions off (the reproduction config), the it's/it is pair detects but never rewrites", async () => {
    const content = "It is fine. Traffic has been steady, but it's been growing for hours.\n";
    const config = {
      extends: ['recheck/microsoft'],
      'microsoft/use-contractions': { severity: 'off' as const },
    };

    const { rules } = await validate(config);
    const pass1 = await runRulesUntilStable([{ path: 'x.md', content }], rules);
    const afterPass1 = pass1.fixedFiles.get('x.md') ?? content;
    const pass2 = await runRulesUntilStable([{ path: 'x.md', content: afterPass1 }], rules);
    const afterPass2 = pass2.fixedFiles.get('x.md') ?? afterPass1;

    expect(afterPass1).toBe(content);
    expect(afterPass2).toBe(afterPass1);

    const problems = await lintContent(content, config);
    expect(problems.some((p) => p.ruleName === 'microsoft/contraction-consistency')).toBe(true);
  });

  // Forces `fix: true` on `microsoft/contraction-consistency` (a user's config overrides the preset)
  // with `microsoft/use-contractions` still off. The guard in `consistency.ts` must still prevent the
  // corruption.
  it('still does not rewrite even with fix: true forced back onto contraction-consistency specifically', async () => {
    const content = "It is fine. Traffic has been steady, but it's been growing for hours.\n";
    const config = {
      extends: ['recheck/microsoft'],
      'microsoft/use-contractions': { severity: 'off' as const },
      'microsoft/contraction-consistency': { fix: true },
    };

    const { rules } = await validate(config);
    const resolvedRule = rules.find((r) => r.shortName === 'microsoft/contraction-consistency');
    expect(resolvedRule?.fix).toBe(true);

    const { fixedFiles } = await runRulesUntilStable([{ path: 'x.md', content }], rules);
    expect(fixedFiles.get('x.md') ?? content).toBe(content);
  });
});
