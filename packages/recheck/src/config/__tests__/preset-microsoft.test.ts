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

// Same namespace-check reasoning as preset-google.test.ts: this preset's
// rule keys are `microsoft/<rule>`, not `recheck/<rule>`, so
// `NormalizedRule.shortName` (which only strips a LEADING `recheck/`
// prefix) never touches them -- `shortName === name === the raw config
// key` for every rule here, same as recheck/google.
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

// =============================================================================
// Detection-only by design (2026-07-30): five adversarial probes of this
// preset's (and recheck/google's) previously-fixable pairs, across three
// rounds of narrowing the fix-safety criterion, found a RISING corruption
// rate on genuinely correct prose (the last round: 18 of 29 probed pairs,
// 62%) spanning every category once believed safe -- including spelling and
// hyphenation. The project decision: remove auto-fix from this preset
// entirely, not narrow the criterion again. See microsoft.ts's own
// "DETECTION-ONLY BY DESIGN" header note and
// `presets/microsoft/PROVENANCE.md`'s "Detection-only" section for the full
// history.
//
// This is the PERMANENT GUARANTEE the brief asks for: derived from the LIVE
// preset object (`presets['recheck/microsoft']`), not a hand-maintained list
// of rule names -- the same inversion the per-pair coverage gate already
// uses. A future contributor adding a new rule, or a new pair to an
// existing rule, and omitting `fix: false` cannot silently reintroduce
// fixing here: `buildMicrosoftPreset()`'s own blanket override (microsoft.ts)
// already prevents that at the source, and this test proves the RETURNED
// object reflects it.
// =============================================================================
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
  // Catches the Vale failure mode: a rule that ships but can never fire.
  // Every rule key the preset registers must appear at least once in the
  // reported rule-name set when linting a document that deliberately
  // violates every one of them.
  it('reports every rule the preset ships', async () => {
    const violations = await readFile(fixture('microsoft-violations.md'), 'utf8');
    const problems = await lintContent(violations, { extends: ['recheck/microsoft'] });
    const reported = new Set(problems.map((p) => p.ruleName));
    const shipped = new Set(Object.keys(presets['recheck/microsoft']));
    expect([...shipped].filter((r) => !reported.has(r))).toEqual([]);
  });

  // The other half of the acceptance gate: compliant prose -- including the
  // guide's OWN approved examples ("Microsoft's" referring to the company,
  // a spaced en-dash UI timestamp, first-mention acronym carve-outs, and
  // the developer-audience terms header/context menu/disk/directory) --
  // must produce zero findings. A false positive here means either the
  // fixture secretly violates the guide (fix the fixture) or the rule is
  // noisier than judged (move it out of the preset).
  it("reports nothing on compliant prose, including the guide's own approved examples", async () => {
    const md = await readFile(fixture('microsoft-clean.md'), 'utf8');
    const problems = await lintContent(md, { extends: ['recheck/microsoft'] });
    expect(problems).toEqual([]);
  });
});

// =============================================================================
// Per-PAIR coverage gate (mirrors preset-google.test.ts's identical gate,
// added there after nine corrupting pairs shipped behind a green per-RULE
// gate -- four of which were found only after this gate was added). One
// firing pair per rule is not enough: every OTHER pair in a multi-pair swap
// rule must independently be proven to fire too, or a corrupting pair (a
// case-only no-op, a substring collision, a dead lookbehind) can ship
// invisibly. The trigger document is generated from the LIVE preset object,
// not a hand-maintained fixture, so it cannot silently drift as pairs are
// added or removed.
// =============================================================================

// `keysAreRegex: true` pairs store a regex SOURCE as their key, not literal
// text (e.g. `\bvs\.` requires embedding the text "vs.", not the four
// characters `\bvs\.` themselves). A future regex pair added here without a
// matching entry fails the test below LOUDLY, naming the exact missing key.
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

// A `keysAreRegex: true` rule can still carry keys that are plain literal
// text under the hood (e.g. `microsoft/no-click`'s `click on`, which has no
// regex metacharacters at all). Only keys containing characters that
// signal deliberate regex syntax need a registered translation above;
// anything else is safe to embed directly.
const RAW_REGEX_SYNTAX = /[\\()?!^$|{}[\]]/;

interface CoverageCase {
  ruleName: string;
  /** The raw config key, exactly as it appears under `pairs` — what's reported in a failure message. */
  configKey: string;
  /** The literal text to embed in the generated document and look for in the reported `match`. */
  example: string;
  /**
   * `consistency` only: a variant that must appear EARLIER in the document
   * than `example` so `example` (the config key's own variant) is the one
   * consistency.ts reports as "losing".
   */
  preamble?: string;
  /**
   * True when the OWNING rule is scoped to `heading` only (e.g.
   * `microsoft/vs-in-headings`) — its trigger text must be embedded in an
   * actual heading line, not an ordinary paragraph, or the rule's own scope
   * filter would never see it.
   */
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

    // A missing regex-example entry is itself a coverage failure -- fail
    // here, with the exact key named, rather than silently skipping it.
    expect(missingExamples).toEqual([]);
    expect(cases.length).toBeGreaterThan(150); // sanity: this preset ships 190+ pairs

    // One paragraph per case (plus an earlier preamble paragraph for
    // `consistency` cases) -- paragraphs never merge across a blank line,
    // so no two cases' trigger text can overlap or shadow each other.
    // `headingOnly` cases (rules scoped strictly to `heading`, e.g.
    // `microsoft/vs-in-headings`) are embedded as their own heading line
    // instead -- a heading-scoped rule's scope filter never sees paragraph
    // text, so a paragraph-embedded trigger would silently never fire.
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

// =============================================================================
// Per-TOKEN coverage for `pattern`-based rules.
// The per-pair coverage test above only walks `swap.pairs`/`consistency.either`
// -- a `pattern` rule's tokens were never individually exercised until this
// gate existed, only proven to fire ONCE for the whole rule (the "reports
// every rule" gate). A token that ships but can never fire is exactly as
// invisible there as an unreachable swap pair was before the per-pair gate
// existed.
//
// Task-10 fix wave B / Step 2: the gate USED TO iterate
// `Object.entries(PATTERN_TOKEN_EXAMPLES)` directly -- so a brand-new
// `pattern` rule added to the preset, or a token quietly deleted from an
// existing one, was invisible here even though the rest of the gate looked
// green. Before this fix, `PATTERN_TOKEN_EXAMPLES` covered only 2 of the
// preset's 24 `pattern` rules (32 of 67 tokens); the reviewer proved the gap
// by deleting 7 tokens from `microsoft/az-no-replacement` and watching every
// gate stay green. The loop below now iterates the LIVE preset object
// (`Object.entries(preset)`) and requires EVERY rule with a `pattern`
// assertion to have an entry in the map at all -- the same inversion that
// made the per-pair gate (above) real. An uncovered rule or token now FAILS
// the gate, named exactly, instead of being silently skipped.
//
// Every token is regex source (unlike a swap key, which is only regex when
// `keysAreRegex` is set), so an example can't always be derived from the key
// itself the way a plain swap key can -- each one is hand-registered below,
// keyed by its EXACT token string so an edit to the token in the preset
// itself fails this test loudly (a stale example silently testing nothing)
// rather than silently passing.
// =============================================================================

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

// Embedding overrides for tokens whose scope or match shape doesn't fit the
// generic "sample text with X inside it" paragraph wrapper below (a
// heading-only scope, a list-item/table/alt scope, or a fragment match that
// needs specific surrounding characters, like an uppercase letter after two
// spaces, or a single em dash standing alone in a table cell). Keyed by
// `${ruleName}\u0000${token}`; anything NOT in this map falls back to the
// plain paragraph wrapper.
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

    // Drift check inverted (fix wave B / Step 2): iterate the LIVE preset's
    // `pattern` rules, not PATTERN_TOKEN_EXAMPLES's own keys. A rule shipped
    // with a `pattern` assertion and NO entry at all in the map below is a
    // coverage failure in its own right, named exactly -- this is exactly
    // what let 22 of 24 pattern rules (35 of 67 tokens) go completely
    // unchecked before this fix.
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

    // A rule with no registered examples at all, or a drifted token list
    // (added, removed, or edited without updating the map above), is itself
    // a coverage failure -- fail here, named exactly, rather than silently
    // testing a stale token that can never fire (or skipping a whole rule).
    expect(missing).toEqual([]);
    expect(expectations.length).toBeGreaterThanOrEqual(67); // sanity: this preset ships 67+ pattern tokens

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

// Final-review fix (Item 3): `microsoft/no-blank-table-cell` is narrowed,
// deliberately, to the em-dash case only -- a truly blank cell can never be
// reported by a `pattern` assertion (its content is the empty string, and
// pattern.ts's zero-width-match guard skips any match against '' no matter
// how the token is written; see microsoft.ts's doc comment on this rule for
// the full reasoning). These tests demonstrate the CHOSEN resolution
// end-to-end: the em-dash case still fires, a real blank cell honestly does
// NOT, and the rewritten token (`^\s*(?:—\s*)?$`, not the old
// `^\s*(?:—)?\s*$`) no longer pays a quadratic cost on a long
// whitespace-only cell.
describe('recheck/microsoft no-blank-table-cell: narrowed to em-dash only (Item 3)', () => {
  it('still reports a cell containing exactly an em dash', async () => {
    const doc = '| Field | Description |\n| --- | --- |\n| name | — |\n';
    const problems = await lintContent(doc, { extends: ['recheck/microsoft'] });
    const matches = problems.filter((p) => p.ruleName === 'microsoft/no-blank-table-cell');
    expect(matches).toHaveLength(1);
    expect(matches[0].match).toBe('—');
  });

  // The claim this rule's message/PROVENANCE entry no longer makes: a
  // genuinely empty cell (no content between the pipes at all) is NOT
  // reported. This is the honest boundary of the chosen resolution, pinned
  // here so a future change that tries to "fix" this by tightening the
  // token doesn't ship a claim the architecture still can't back up (see the
  // rule's doc comment in microsoft.ts for why a `pattern` token structurally
  // cannot do this).
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

  // Direct engine-level perf check for the quadratic-pattern fix. A real
  // table.cell segment is always pre-trimmed by the extractor (see
  // scopes/extractor.ts's `tableRow` case), so it can never itself carry a
  // long whitespace RUN that fails to match -- this test bypasses that
  // guarantee deliberately, feeding pattern.execute() the adversarial input
  // directly, because the token being fixed is a plain string the engine
  // ships and could be reused or reached by another path; its own
  // worst-case cost is worth pinning regardless of whether table.cell
  // happens to prevent reaching it today. 32KB of whitespace followed by
  // one disqualifying character never satisfies `^\s*(?:—\s*)?$` (there's
  // no em dash and the trailing 'x' blocks `$`), which is exactly the shape
  // that made the OLD token (`^\s*(?:—)?\s*$` -- two INDEPENDENTLY
  // backtracking `\s*` groups either side of the optional em dash)
  // quadratic: measured 615ms on this exact input on this machine (the
  // review's number, 632ms, is the same order of magnitude). Folding the
  // trailing `\s*` inside the optional group removes the ambiguity, so the
  // new token resolves the same non-match in well under a millisecond.
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

    // No match either way -- the trailing 'x' means neither em dash nor
    // blank -- the point of this test is the TIMING, not the finding.
    expect(problems).toEqual([]);
    expect(elapsed).toBeLessThan(100);
  });
});

// =============================================================================
// Fix safety, RETIRED into detection-only proof (2026-07-30): this describe
// block used to check that every fixable pair's fix was both safe and
// idempotent. Now that the preset is detection-only by design (no rule in
// `recheck/microsoft` auto-fixes -- see the "is detection-only" describe
// block near the top of this file, and microsoft.ts's own "DETECTION-ONLY
// BY DESIGN" header note), there is no fix left to prove safe: every case
// below that used to demonstrate a REAL rewrite now demonstrates the
// opposite, that `--fix` leaves the text completely alone while detection
// still fires. Kept as its own describe block (not deleted) because "this
// input must never be rewritten" is exactly the assertion worth keeping --
// same reasoning as preset-google-fix-wave-c.test.ts's rewrite.
// =============================================================================

// Same convergence loop the CLI's `--fix` uses (see
// preset-google-fix-wave-c.test.ts's identical helper).
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

  // POSTURE CHANGE (detection-only task): `tooltip-capitalization` used to
  // be a real, safe fix (not a no-op) -- "ToolTip"'s internal mixed casing
  // doesn't match applyMatchCase's simple ALL-CAPS/Capitalized heuristics,
  // so it round-tripped correctly and idempotently. It is now detection-only
  // like every other rule in this preset: `--fix`, twice, must leave the
  // genuine violation completely unchanged, while detection still fires.
  it('tooltip-capitalization no longer rewrites "ToolTip" to "tooltip", but still detects it', async () => {
    const content = 'Hover over the ToolTip to see more details.\n';
    const { afterPass1, afterPass2 } = await fixTwice(content);
    expect(afterPass1).toBe(content);
    expect(afterPass2).toBe(afterPass1);

    const problems = await lintContent(content, { extends: ['recheck/microsoft'] });
    expect(problems.some((p) => p.ruleName === 'microsoft/tooltip-capitalization')).toBe(true);
  });

  // no-click's anchoring must not corrupt the hyphenated compounds or the
  // unrelated "clickstream"/"clickthrough" terms it was designed to leave
  // alone -- fixed twice, to prove both correctness and idempotency. This
  // rule was already detection-only pre-existing (`fix: false`, see
  // "anchor gaps closed" below), so this case is unaffected by the
  // detection-only change; kept here as the near-miss half of the pair with
  // `tooltip-capitalization` immediately above (a real fix that went away)
  // and the genuine-violation case in "anchor gaps closed" (a detection
  // that was always there).
  it('no-click leaves double-click, right-click, clickstream, and clickthrough untouched', async () => {
    const content =
      'Double-click the icon, or right-click for more options. ' +
      'The dashboard reports clickstream and clickthrough data.\n';
    const { afterPass1, afterPass2 } = await fixTwice(content);
    expect(afterPass1).toBe(content);
    expect(afterPass2).toBe(afterPass1);
  });
});

// =============================================================================
// Task-10 fix wave B acceptance gate 1: every corruption string named in
// Step 3 (us-spelling inflection collapse) and Step 4 (~15 Tier-1 pairs
// rewriting correct prose) of task-10-fixB-brief.md, run through --fix
// TWICE, must come out either byte-identical (the term was dropped,
// anchored away, or demoted to detection-only) or CORRECTED WITHOUT
// CORRUPTION (the inflection-aware us-spelling fixes). Several of the
// original defects only appeared on the SECOND --fix pass, so a single-pass
// check would have been insufficient evidence.
// =============================================================================

describe('recheck/microsoft fix wave B: Step 3 (us-spelling inflections) no longer collapse', () => {
  // POSTURE CHANGE (detection-only task, 2026-07-30): these five
  // inflections used to be genuinely, safely auto-fixed -- the whole point
  // of fix wave B's Step 3 was splitting `us-spelling`'s alternation-group
  // keys so each inflection maps to its own correct output instead of
  // collapsing onto whichever form the config happened to name (see the
  // preset file header's "FIX WAVE B" note). That correctness proof is now
  // moot: `microsoft/us-spelling`, like every other rule in this preset, is
  // detection-only by design. `--fix`, twice, must leave each one completely
  // UNCHANGED; detection must still fire against the correct rule.
  const noLongerFixes: Array<[string, string]> = [
    ['The team is modelling the traffic pattern.\n', 'microsoft/us-spelling'],
    ['The job was cancelling when the timeout occurred.\n', 'microsoft/us-spelling'],
    ['The request was authorised by the admin.\n', 'microsoft/us-spelling'],
    ['Authorisation happens before the redirect.\n', 'microsoft/us-spelling'],
    ['Customisation of the theme is optional.\n', 'microsoft/us-spelling'],
    // FIX-POSTURE CHANGE WAVE 2 (proper-noun axis): `centre`/`catalogue`
    // moved to `microsoft/us-spelling-detect` (fix: false, pre-existing
    // before the detection-only change) -- "Centre County, Pennsylvania"
    // and "Bell Centre" are real place/venue names spelled with "Centre",
    // and "Catalogue of Life" is a real, commonly cited species database
    // spelled with "Catalogue"; none of the three would survive a blind fix.
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
  // Every string is CORRECT prose as written -- `--fix`, twice, must leave
  // each one completely UNCHANGED (whether because the pair was dropped,
  // anchored away from this exact phrasing, or demoted to a non-fixable
  // pattern/`fix: false` rule).
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

  // POSTURE CHANGE (fix-posture task): `exit`/`launch`/`boot` (az-lifecycle-
  // verbs), `blade` (az-ui-nouns), `beta` (az-judgment-words), `in addition`
  // (simple-words), and `print out` (az-real-replacements) all flipped to
  // `fix: false` -- anchoring away from a noun-compound collision reduces
  // false fixes, but every one of these is still a different-word
  // substitution, not a same-word normalization, so the posture change
  // applies regardless of how well-anchored the pair is. The mirror check
  // now proves the OPPOSITE of "still fixes": `--fix` must leave the
  // genuine violation completely UNCHANGED, while detection (the rule
  // firing at all) must still hold.
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

// =============================================================================
// Task-10 fix wave B acceptance gate 2: the nine previously-passing
// substring/homograph collision probes named in the brief -- none of them
// are targeted by ANY rule in this preset (see PROVENANCE.md's "Excluded
// candidates" table), so this wave's edits must not have accidentally
// introduced a new collision for any of them.
// =============================================================================

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

// =============================================================================
// Task-10 fix wave C acceptance gate 1: a `CONFIRMED` verifier verdict only
// establishes that the guide discusses a term -- it does not establish that a
// blind textual substitution is safe. Every pair below was reclassified from
// a fixable swap to detection-only (or fix:false) because its own live-page
// quote is a caution against conflation ("as well as"), scoped to a narrower
// context than shipped ("or greater/higher/lower", "visit"), sense-scoped
// with a common unrelated noun/adjective sense ("leverage", "glyph"), or has
// no single replacement stated at all ("de facto"/"ad hoc"/"vis-a-vis").
// `--fix`, twice, must leave every one of these completely UNCHANGED -- the
// corruption is gone because the rule no longer touches the text, not
// because the text happens to already match the target.
// =============================================================================

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

  // Acceptance item 3: a pair reclassified to detection-only must still
  // CATCH its genuine violation -- "it stopped corrupting" and "it stopped
  // working" look identical from a green `unchanged` suite above alone.
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

// =============================================================================
// Task-10 fix wave C acceptance gate 2: anchor gaps found while auditing the
// already-anchored pairs from fix wave B -- these stay FIXABLE, just with a
// wider exclusion list, so both directions are checked: the near-miss must
// stay unchanged, and the genuine violation must still fix correctly.
// =============================================================================

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

  // POSTURE CHANGE (fix-posture task): `hang`/`hangs` (az-state-failure),
  // `print out` (az-real-replacements), and `click` (no-click) all flipped
  // to `fix: false` -- a wider anchor reduces false fixes, it doesn't turn
  // a word-choice substitution into a same-word normalization.
  //
  // POSTURE CHANGE (detection-only task, 2026-07-30): `an SQL` -> `a SQL`
  // (article-before-acronym) used to be the one pair in this describe block
  // that survived BOTH posture changes -- grammatical article agreement has
  // no unrelated-sense risk, so it kept fixing correctly through the
  // fix-posture change above. It does not survive the detection-only
  // change: every rule in this preset, including this one, is now
  // `fix: false` regardless of how safe the pair looks. Moved into the
  // "still detects but no longer fixes" bucket below rather than kept as
  // its own "still fixes" case.
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

// =============================================================================
// Fix-posture wave 2 acceptance gate: the proper-noun axis. A pair keeps
// `fix: true` only if the avoid-term also cannot occur as part of a real
// organization, product, brand, or place name -- "USA Gymnastics" (the US
// national governing body), "U.S. Bank"/"U.S. Steel" (real US companies),
// "U.S.A. Track and Field" (a national governing body), "Bell Centre"/
// "Centre County, Pennsylvania" (real place/venue names spelled with
// "Centre"), and the OpenAPI/JSON Schema `boolean` type keyword (a Q2
// unrelated-legitimate-sense finding surfaced by the same sweep) all
// demonstrate the risk. `--fix`, twice, must leave every one of these
// completely unchanged, and detection must still fire.
// =============================================================================

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

  // Every rule reclassified this wave must still be able to FIRE (detect) on
  // a genuine violation elsewhere in the same rule (no rule went dead): the
  // remaining `microsoft/us-spelling` and `microsoft/az-case-fixable` pairs
  // (not moved to the proper-noun/detect-only sibling) still report.
  //
  // POSTURE CHANGE (detection-only task, 2026-07-30): both of these used to
  // be "still fixes correctly" cases -- the whole point of this wave's
  // proper-noun split was proving the pairs that DIDN'T move still worked.
  // Detection-only makes the fixing half of that moot: neither pair
  // auto-fixes any more, same as everything else in this preset. Detection
  // is what's left to prove, so these now assert "leaves it unchanged,
  // still reports."
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

// =============================================================================
// Consistency engine guard (fix-posture task, Step 2): reproduces the exact
// corruption named in the brief -- "it's" expands to EITHER "it is" OR "it
// has", so `consistency`'s old first-seen-wins fix logic collapsed the two
// ("It is fine. ... it's been growing for hours." -> "it is been growing
// for hours."). `microsoft/contraction-consistency` ships this exact
// `"it's": "it is"` pair. In the shipped preset this was masked only by an
// accidental interaction with the unrelated `microsoft/use-contractions`
// rule (which ships `'it is': "it's"`, rewriting the damage back to "it's"
// in a later fix pass) -- setting THAT rule to `severity: off` is the
// reproduction recipe the brief names, so it belongs in this test. The
// consistency engine's own word-count guard (rules/scope/consistency.ts)
// now makes this safe independent of the preset's detection-only change:
// even a user who overrides `microsoft/contraction-consistency` back to
// `fix: true` (a user's own config always wins over the preset, per this
// package's README) can no longer trigger the corruption, because the pair
// itself (1 word vs. 2) fails the guard at the engine level.
// =============================================================================

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

    expect(afterPass1).toBe(content); // no corruption -- unchanged, even before the second pass
    expect(afterPass2).toBe(afterPass1); // idempotent

    const problems = await lintContent(content, config);
    expect(problems.some((p) => p.ruleName === 'microsoft/contraction-consistency')).toBe(true);
  });

  // Direct proof that the ENGINE guard, not just this preset's blanket
  // `fix: false`, is what stops the corruption: force `fix: true` back onto
  // `microsoft/contraction-consistency` specifically (a user's own config
  // key always overrides the preset's, per this package's README), with
  // `microsoft/use-contractions` still off. If the guard lived only in the
  // preset (Step 1), this would corrupt again; because the guard lives in
  // `consistency.ts` itself (Step 2), it still does not.
  it('still does not rewrite even with fix: true forced back onto contraction-consistency specifically', async () => {
    const content = "It is fine. Traffic has been steady, but it's been growing for hours.\n";
    const config = {
      extends: ['recheck/microsoft'],
      'microsoft/use-contractions': { severity: 'off' as const },
      'microsoft/contraction-consistency': { fix: true },
    };

    const { rules } = await validate(config);
    const resolvedRule = rules.find((r) => r.shortName === 'microsoft/contraction-consistency');
    expect(resolvedRule?.fix).toBe(true); // sanity: the override really took effect

    const { fixedFiles } = await runRulesUntilStable([{ path: 'x.md', content }], rules);
    expect(fixedFiles.get('x.md') ?? content).toBe(content);
  });
});
