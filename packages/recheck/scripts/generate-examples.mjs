#!/usr/bin/env node
// Task 12 of Phase 4: generates the four copy-pasteable example configs
// under packages/recheck/examples/ from the four style-guide presets
// (recheck/google, recheck/microsoft, recheck/inclusive-language,
// recheck/plain-language). See .superpowers/sdd/task-12-brief.md and
// task-12-resolutions.md for the shape this file implements.
//
// Each generated example has four parts, in this order:
//   1. An attribution header (source, license, sync date) as YAML comments.
//   2. "What to paste" — the two-to-four-line `extends` block, the actual
//      adoption cost. This is the only LIVE (parseable) content most readers
//      need.
//   3. "How to tune it" — override patterns verified to work today, as YAML
//      comments (not live: these are illustrations of what to add to YOUR
//      config, not a silent modification of this one).
//   4. "Full expansion (reference)" — the preset's entire resolved rule set,
//      alphabetized, rendered as real (live) YAML. Reading it answers "what
//      am I actually getting" without running the tool; because every value
//      here is identical to what `extends` already resolves to, copying the
//      whole file is equivalent to just the two-line extends block above —
//      redundant, not broken, which is why it's "reference," not "paste
//      this too."
// A hand-maintained appendix (examples/appendices/<name>.appendix.yaml) is
// then appended verbatim — NOISY candidates the guide states but this
// preset doesn't enforce, and a checklist of content that needs a human,
// not a linter.
//
// Usage:
//   node scripts/generate-examples.mjs          regenerate all four files
//   node scripts/generate-examples.mjs --check  exit 1 if any file would
//                                                change; writes nothing
//
// Requires the package to have already been built: this script (and the
// drift test that imports renderExample()/examplePath() from it) reads the
// BUILT lib/, since a plain .mjs file can't import .ts sources directly.

import * as yaml from 'js-yaml';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.join(here, '..');

const PRESET_NAMES = [
  'google',
  'microsoft',
  'inclusive-language',
  'plain-language',
  'technical-english',
];

export function examplePath(name) {
  return path.join(packageRoot, 'examples', `${name}.yaml`);
}

function appendixPath(name) {
  return path.join(packageRoot, 'examples', 'appendices', `${name}.appendix.yaml`);
}

// The repo's pre-commit hook runs `oxfmt --write` over every staged file,
// YAML included (see the root package.json's lint-staged config), and
// oxfmt has its own opinion on quote style for at least one edge case
// js-yaml's `dump()` doesn't match by default (a bundled swap pair whose
// replacement is a single straight-quote character: js-yaml emits the
// single-quoted, doubled-escape form `''''`; oxfmt prefers `"'"` instead,
// to avoid the escape). Left unreconciled, the hook would silently rewrite
// the committed file on every commit that touches it, permanently
// diverging from this script's own raw output and breaking the drift test
// for anyone who regenerates without then also running oxfmt by hand.
// Running oxfmt here — inside renderExample() itself, the one function
// both the CLI and the drift test call — makes the committed file and a
// fresh render identical by construction, instead of hoping the two
// formatters never disagree.
function findOxfmtBinary() {
  let dir = packageRoot;
  for (;;) {
    const candidate = path.join(dir, 'node_modules', '.bin', 'oxfmt');
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

async function formatWithOxfmt(content) {
  const bin = findOxfmtBinary();
  if (!bin) {
    throw new Error(
      'generate-examples: could not find the oxfmt binary (expected under some ' +
        'ancestor node_modules/.bin) — run `npm install` at the repo root first.'
    );
  }
  const tmpFile = path.join(
    os.tmpdir(),
    `recheck-example-${process.pid}-${Math.random().toString(36).slice(2)}.yaml`
  );
  await writeFile(tmpFile, content, 'utf8');
  try {
    const result = spawnSync(bin, ['--write', tmpFile], { encoding: 'utf8' });
    if (result.status !== 0) {
      throw new Error(
        `generate-examples: oxfmt exited ${result.status}: ${result.stderr || result.stdout}`
      );
    }
    return await readFile(tmpFile, 'utf8');
  } finally {
    await rm(tmpFile, { force: true });
  }
}

async function loadLib() {
  try {
    const { validate } = await import('../lib/config/validate.js');
    return { validate };
  } catch (error) {
    if (error && error.code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error(
        'examples:generate requires a built package — run `npm run compile` first ' +
          '(lib/config/validate.js was not found).'
      );
    }
    throw error;
  }
}

// Stable per-rule key order for the "Full expansion" section. Only keys a
// rule actually has are emitted (BaseRule/NormalizedRule fields are mostly
// optional) — `name`/`shortName` are skipped since the rule's own top-level
// key already encodes the name.
const RULE_FIELD_ORDER = [
  'severity',
  'message',
  'link',
  'scope',
  'tags',
  'description',
  'appliesTo',
  'excludes',
  'exceptions',
  'fix',
  'assertions',
];

function orderRule(rule) {
  const ordered = {};
  for (const key of RULE_FIELD_ORDER) {
    if (rule[key] !== undefined) ordered[key] = rule[key];
  }
  return ordered;
}

function pairCount(rules, ruleName) {
  const rule = rules.find((r) => r.name === ruleName);
  const pairs = rule?.assertions?.swap?.pairs;
  if (!pairs) {
    throw new Error(`generate-examples: expected "${ruleName}" to have swap.pairs`);
  }
  return Object.keys(pairs).length;
}

function dumpYaml(doc) {
  return yaml.dump(doc, { lineWidth: -1, noRefs: true }).trimEnd();
}

function banner(title) {
  const rule = '# ' + '='.repeat(78);
  return `${rule}\n# ${title}\n${rule}`;
}

function section(title) {
  const rule = '# ' + '-'.repeat(78);
  return `${rule}\n# ${title}\n${rule}`;
}

// -----------------------------------------------------------------------
// Attribution headers (mirrors each preset's PROVENANCE.md header exactly —
// see packages/recheck/presets/<name>/PROVENANCE.md for the full citation).
// -----------------------------------------------------------------------

function renderHeader(name) {
  const lines = {
    google: [
      banner('recheck/google — Google developer documentation style guide, as a config'),
      '# Source:     Google developer documentation style guide',
      '#             https://developers.google.com/style',
      '# License:    CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/',
      '# Synced:     2026-07-29',
      "# Provenance: packages/recheck/presets/google/PROVENANCE.md (every rule's",
      '#             source page, quote, and verdict; everything considered and',
      '#             NOT shipped, and why)',
      '#',
      "# Rules are adapted to Recheck's own assertion vocabulary (swap, pattern,",
      "# capitalization, length); wording is paraphrased in each rule's `message`,",
      '# never quoted verbatim from the guide.',
      '#',
      '# Generated file — do not hand-edit. Regenerate with `node scripts/generate-examples.mjs`',
      "# after changing src/config/presets/google.ts or this file's appendix",
      '# (examples/appendices/google.appendix.yaml).',
    ],
    microsoft: [
      banner('recheck/microsoft — Microsoft Writing Style Guide, as a config'),
      '# Source:     Microsoft Writing Style Guide',
      '#             https://learn.microsoft.com/en-us/style-guide/welcome/',
      "# License:    CC BY 4.0 — granted by the guide's backing GitHub repository,",
      '#             NOT by any learn.microsoft.com page (none states a licence):',
      '#             https://github.com/MicrosoftDocs/microsoft-style-guide/blob/main/LICENSE',
      '# Synced:     2026-07-29',
      '# Provenance: packages/recheck/presets/microsoft/PROVENANCE.md',
      '#',
      "# Rules are adapted to Recheck's own assertion vocabulary (swap, pattern,",
      "# capitalization, length, occurrence); wording is paraphrased in each rule's",
      '# `message`, never quoted verbatim from the guide.',
      '#',
      '# Generated file — do not hand-edit. Regenerate with `node scripts/generate-examples.mjs`',
      "# after changing src/config/presets/microsoft.ts or this file's appendix",
      '# (examples/appendices/microsoft.appendix.yaml).',
    ],
    'technical-english': [
      banner('recheck/technical-english — ASD-STE100-inspired writing principles, as a config'),
      '# Source:     Publicly documented principles of ASD-STE100 Simplified',
      '#             Technical English. https://www.asd-ste100.org',
      '# Notice:     ASD-STE100 Simplified Technical English is a Copyright and',
      '#             a Trade Mark of ASD, Brussels, Belgium. This preset is an',
      '#             independent work; ASD and the STEMG do not review, approve,',
      '#             certify, or endorse it. It reproduces no part of the',
      '#             standard.',
      '# Provenance: packages/recheck/presets/technical-english/PROVENANCE.md',
      '#',
      '# Generated file — do not hand-edit. Regenerate with `node scripts/generate-examples.mjs`',
      "# after changing src/config/presets/technical-english.ts or this file's",
      '# appendix (examples/appendices/technical-english.appendix.yaml).',
    ],
    'inclusive-language': [
      banner('recheck/inclusive-language — composable inclusive/bias-free word list'),
      "# What it is: the INTERSECTION of recheck/google's and recheck/microsoft's",
      '# own confirmed inclusive/bias-free/ableist/accessibility content —',
      '# terminology both flagship guides independently say to avoid.',
      '# Guide-agnostic; carries no structural rules of its own.',
      '# Sources:    Google developer documentation style guide (CC BY 4.0,',
      '#             https://developers.google.com/style) and the Microsoft',
      '#             Writing Style Guide (CC BY 4.0 via its backing GitHub',
      "#             repository's LICENSE file:",
      '#             https://github.com/MicrosoftDocs/microsoft-style-guide/blob/main/LICENSE)',
      '# Synced:     2026-07-30 (no new fetch — built from five existing',
      '#             verification reports; see PROVENANCE.md)',
      '# Provenance: packages/recheck/presets/inclusive-language/PROVENANCE.md',
      '#',
      '# Generated file — do not hand-edit. Regenerate with `node scripts/generate-examples.mjs`',
      "# after changing src/config/presets/inclusive-language.ts or this file's",
      '# appendix (examples/appendices/inclusive-language.appendix.yaml).',
    ],
    'plain-language': [
      banner('recheck/plain-language — US federal plain-language guidance, as a config'),
      '# Source:     US federal plain-language guidance',
      '#             https://digital.gov/guides/plain-language',
      '# License:    Public domain (US government work) — no attribution',
      '#             required; cited here for auditability.',
      '# Synced:     2026-07-30',
      '# Provenance: packages/recheck/presets/plain-language/PROVENANCE.md',
      '#',
      '# Generated file — do not hand-edit. Regenerate with `node scripts/generate-examples.mjs`',
      "# after changing src/config/presets/plain-language.ts or this file's",
      '# appendix (examples/appendices/plain-language.appendix.yaml).',
    ],
  };
  return lines[name].join('\n');
}

// -----------------------------------------------------------------------
// "What to paste" — the actual adoption cost.
// -----------------------------------------------------------------------

function renderWhatToPaste(name) {
  const extendsYaml = {
    google: dumpYaml({ extends: ['recheck/markdown', 'recheck/google'] }),
    microsoft: dumpYaml({ extends: ['recheck/markdown', 'recheck/microsoft'] }),
    'technical-english': dumpYaml({ extends: ['recheck/technical-english'] }),
    'inclusive-language': dumpYaml({ extends: ['recheck/prose', 'recheck/inclusive-language'] }),
    'plain-language': dumpYaml({ extends: ['recheck/markdown', 'recheck/plain-language'] }),
  }[name];

  const notes = {
    google: [
      section('What to paste'),
      '# This is the entire adoption cost: two lines. `recheck/markdown` is the',
      "# 53-rule markdownlint-parity structural set; `recheck/google` layers Google's",
      '# own style opinions on top — it ships its own heading/list/table/link',
      '# structural rules too, so the two are complementary, not duplicates.',
    ],
    microsoft: [
      section('What to paste'),
      '# This is the entire adoption cost: two lines. `recheck/markdown` is the',
      '# 53-rule markdownlint-parity structural set; `recheck/microsoft` layers the',
      "# Writing Style Guide's own opinions on top — it ships its own",
      '# heading/list/table/alt-text structural rules too, so the two are',
      '# complementary, not duplicates.',
    ],
    'inclusive-language': [
      section('What to paste'),
      '# Do NOT stack this onto recheck/google or recheck/microsoft: because every',
      "# rule here is built as the intersection of both flagships' own confirmed",
      '# content, stacking it onto either one double-reports most of its findings',
      '# (measured: 7 of 11 duplicate a google/* finding when stacked onto',
      '# recheck/google alone; 6 of 11 duplicate a microsoft/* finding onto',
      '# recheck/microsoft alone — see PROVENANCE.md\'s "Duplicate-finding audit").',
      '# This preset earns its keep standalone, alongside recheck/prose, or on a',
      '# project running neither flagship.',
    ],
    'technical-english': [
      section('What to paste'),
      '# Three rules: sentence length (max 25 words; the descriptive-text bound),',
      '# paragraph length (max 6 sentences), and a passive-voice heuristic at',
      '# info. For word-choice checking, compose with recheck/plain-language;',
      '# the STE approved-word dictionary is deliberately NOT encoded (see the',
      '# Notice above and PROVENANCE.md).',
    ],
    'plain-language': [
      section('What to paste'),
      '# Unlike recheck/inclusive-language, this composes cleanly onto either',
      '# flagship: after removing the two pairs that duplicated a flagship outright',
      '# ("in order to" -> "to", "utilize" -> "use"), only 3 duplicate findings',
      '# remain against either recheck/google or recheck/microsoft — an accepted',
      '# paragraph-length overlap and a coincidental substring collision with',
      "# use-contractions, not content duplication (see PROVENANCE.md's",
      '# "Duplicate-finding audit"). Combine with recheck/markdown for full',
      '# structural linting too.',
    ],
  }[name];

  return [...notes, '', extendsYaml].join('\n');
}

// -----------------------------------------------------------------------
// "How to tune it" — verified override patterns, as comments (not live).
// -----------------------------------------------------------------------

function renderHowToTune(name, rules) {
  const s = section('How to tune it');
  const preamble = [
    s,
    "# Your own rule keys always win over the preset's (`extends` resolves",
    '# first, then your top-level keys are merged on top, per rule key).',
  ];

  const directives = [
    '#',
    '# Silence one occurrence instead of the whole rule, with an inline HTML',
    '# comment directive — works on any rule, from any preset:',
    '#',
  ];

  const sharpEdgePreamble = [
    '#',
    '# THE SHARP EDGE — read this before reaching for a per-term override.',
    '# Merging happens per ASSERTION ID, not per option inside it.',
  ];

  const sharpEdgeClose = [
    '# So today, to reject one term out of a bundled swap/pattern rule, your',
    '# options are: turn the whole rule off, restate its entire pairs/tokens',
    '# yourself, or inline-disable each occurrence as shown above. A per-term',
    '# opt-out for swap/pattern is a known follow-up, not a promise.',
  ];

  const escapeHatchesIntro = [
    '#',
    '# Two assertion types DO already have a per-term escape hatch:',
    "# `capitalization`'s `exceptions` (an array of allowed terms that COMPOSES",
    '# with the built-in technical-proper-noun vocabulary and anything else you',
    "# add — it does not replace either) and `spelling`'s `ignore` (spelling",
    "# itself isn't shipped by any of these four presets — see the README's",
    '# "Opt-in prose assertions").',
  ];

  if (name === 'google') {
    const n = pairCount(rules, 'google/compound-forms');
    return [
      ...preamble,
      '#',
      '# Turn a rule off entirely:',
      '#',
      '#   google/no-via:',
      '#     severity: off',
      '#',
      '# Downgrade an error to a warning:',
      '#',
      '#   google/heading-sentence-case:',
      '#     severity: warn',
      ...directives,
      '#   <!-- recheck-disable-next-line google/no-via -->',
      '#   Log in via the admin console.',
      '#',
      '#   <!-- recheck-disable google/no-via -->',
      '#   ...several occurrences here are all silenced...',
      '#   <!-- recheck-enable google/no-via -->',
      '#',
      '#   <!-- recheck-disable-file -->',
      ...sharpEdgePreamble,
      '# Setting:',
      '#',
      '#   google/compound-forms:',
      '#     assertions:',
      '#       swap:',
      '#         ignoreCase: false',
      '#',
      '# does not just flip `ignoreCase` — it REPLACES the whole `swap` assertion',
      `# object, silently dropping the preset's ${n}-entry \`pairs\` map along with`,
      '# it, and the config then fails validation outright:',
      '#',
      '#   Rule "google/compound-forms": swap requires a "pairs" object mapping',
      '#   find -> replace strings',
      '#',
      '# (verified against this exact rule).',
      ...sharpEdgeClose,
      ...escapeHatchesIntro,
      "# For example, to stop this preset's own sentence-case rule from flagging",
      "# your product's name:",
      '#',
      '#   google/heading-sentence-case:',
      '#     assertions:',
      '#       capitalization:',
      '#         match: $sentence',
      '#         exceptions: [Your Product Name]',
      '#',
      '# Verified: this reports zero findings on a heading using "Your Product',
      '# Name" while every other sentence-case violation still fires normally.',
    ].join('\n');
  }

  if (name === 'microsoft') {
    const n = pairCount(rules, 'microsoft/spelling-hyphenation');
    return [
      ...preamble,
      '#',
      '# Turn a rule off entirely:',
      '#',
      '#   microsoft/az-navigation:',
      '#     severity: off',
      '#',
      '# Downgrade an error to a warning:',
      '#',
      '#   microsoft/heading-sentence-case:',
      '#     severity: warn',
      ...directives,
      '#   <!-- recheck-disable-next-line microsoft/az-navigation -->',
      '#   Click the hot link to continue.',
      '#',
      '#   <!-- recheck-disable microsoft/az-navigation -->',
      '#   ...several occurrences here are all silenced...',
      '#   <!-- recheck-enable microsoft/az-navigation -->',
      '#',
      '#   <!-- recheck-disable-file -->',
      ...sharpEdgePreamble,
      '# Setting:',
      '#',
      '#   microsoft/spelling-hyphenation:',
      '#     assertions:',
      '#       swap:',
      '#         ignoreCase: false',
      '#',
      '# does not just flip `ignoreCase` — it REPLACES the whole `swap` assertion',
      `# object, silently dropping the preset's ${n}-entry \`pairs\` map along with`,
      '# it, and the config then fails validation outright:',
      '#',
      '#   Rule "microsoft/spelling-hyphenation": swap requires a "pairs" object',
      '#   mapping find -> replace strings',
      '#',
      '# (verified against this exact rule).',
      ...sharpEdgeClose,
      ...escapeHatchesIntro,
      "# For example, to stop this preset's own sentence-case rule from flagging",
      "# your product's name:",
      '#',
      '#   microsoft/heading-sentence-case:',
      '#     assertions:',
      '#       capitalization:',
      '#         match: $sentence',
      '#         exceptions: [Your Product Name]',
      '#',
      '# Verified: this reports zero findings on a heading using "Your Product',
      '# Name" while every other sentence-case violation still fires normally.',
    ].join('\n');
  }

  if (name === 'inclusive-language') {
    const n = pairCount(rules, 'inclusive-language/blacklist-whitelist');
    return [
      ...preamble,
      '#',
      '# Turn a rule off entirely:',
      '#',
      '#   inclusive-language/nuke:',
      '#     severity: off',
      '#',
      '# Every rule in this preset ships at `warn` — upgrade one to `error` if',
      '# your team wants it to fail CI:',
      '#',
      '#   inclusive-language/slave:',
      '#     severity: error',
      ...directives,
      '#   <!-- recheck-disable-next-line inclusive-language/nuke -->',
      '#   Nuke the staging database before the demo.',
      '#',
      '#   <!-- recheck-disable inclusive-language/nuke -->',
      '#   ...several occurrences here are all silenced...',
      '#   <!-- recheck-enable inclusive-language/nuke -->',
      '#',
      '#   <!-- recheck-disable-file -->',
      ...sharpEdgePreamble,
      '# Setting:',
      '#',
      '#   inclusive-language/blacklist-whitelist:',
      '#     assertions:',
      '#       swap:',
      '#         ignoreCase: false',
      '#',
      '# does not just flip `ignoreCase` — it REPLACES the whole `swap` assertion',
      `# object, silently dropping the preset's ${n}-entry \`pairs\` map along with`,
      '# it, and the config then fails validation outright:',
      '#',
      '#   Rule "inclusive-language/blacklist-whitelist": swap requires a "pairs"',
      '#   object mapping find -> replace strings',
      '#',
      '# (verified against this exact rule).',
      ...sharpEdgeClose,
      '#',
      '# This preset ships no `capitalization`/`spelling` rule of its own, so the',
      "# per-term escape hatch those two assertion types offer doesn't apply",
      '# here directly — but if you pair this preset with `recheck/prose` (the',
      "# recommended combination above), that preset's own `recheck/capitalization`",
      '# rule already has it. See examples/google.yaml or examples/microsoft.yaml',
      '# for a worked, verified example of that escape hatch.',
    ].join('\n');
  }

  if (name === 'technical-english') {
    return [
      ...preamble,
      '#',
      '# Tighten the sentence bound for procedure-only content (the standard',
      '# recommends 20 words in procedures, 25 in descriptive text):',
      '#',
      '# technical-english/sentence-length:',
      '#   severity: warn',
      '#   scope: sentence',
      '#   assertions:',
      '#     length:',
      '#       unit: words',
      '#       max: 20',
      '#',
      '# The passive-voice heuristic ships at `info`; turn it off if it reads',
      '# as noise for your corpus:',
      '#',
      '# technical-english/passive-voice:',
      '#   severity: off',
      ...directives,
      '# <!-- recheck-disable-next-line technical-english/sentence-length -->',
    ].join('\n');
  }

  // plain-language
  const n = pairCount(rules, 'plain-language/complex-words');
  return [
    ...preamble,
    '#',
    '# Turn a rule off entirely:',
    '#',
    '#   plain-language/excess-intensifiers:',
    '#     severity: off',
    '#',
    '# Downgrade an error to a warning:',
    '#',
    '#   plain-language/paragraph-max-words:',
    '#     severity: warn',
    ...directives,
    '#   <!-- recheck-disable-next-line plain-language/excess-intensifiers -->',
    '#   This is absolutely, completely the right approach.',
    '#',
    '#   <!-- recheck-disable plain-language/excess-intensifiers -->',
    '#   ...several occurrences here are all silenced...',
    '#   <!-- recheck-enable plain-language/excess-intensifiers -->',
    '#',
    '#   <!-- recheck-disable-file -->',
    ...sharpEdgePreamble,
    '# Setting:',
    '#',
    '#   plain-language/complex-words:',
    '#     assertions:',
    '#       swap:',
    '#         ignoreCase: false',
    '#',
    '# does not just flip `ignoreCase` — it REPLACES the whole `swap` assertion',
    `# object, silently dropping the preset's ${n}-entry \`pairs\` map along with`,
    '# it, and the config then fails validation outright:',
    '#',
    '#   Rule "plain-language/complex-words": swap requires a "pairs" object',
    '#   mapping find -> replace strings',
    '#',
    '# (verified against this exact rule).',
    ...sharpEdgeClose,
    '#',
    '# This preset ships no `capitalization`/`spelling` rule of its own, so the',
    "# per-term escape hatch those two assertion types offer doesn't apply here",
    '# directly — but if you pair this preset with `recheck/prose`, that',
    "# preset's own `recheck/capitalization` rule already has it. See",
    '# examples/google.yaml or examples/microsoft.yaml for a worked, verified',
    '# example of that escape hatch.',
  ].join('\n');
}

// -----------------------------------------------------------------------
// "Full expansion (reference)" — the resolved rule set, alphabetized.
// -----------------------------------------------------------------------

function renderFullExpansion(presetId, rules) {
  const sorted = [...rules].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const doc = {};
  for (const rule of sorted) {
    doc[rule.name] = orderRule(rule);
  }

  return [
    section('Full expansion (reference)'),
    `# This is what \`extends: [${presetId}]\` resolves to today: all ${sorted.length} rules,`,
    '# alphabetized by rule id, generated straight from the live preset (`node',
    '# scripts/generate-examples.mjs`). You do not need to copy any of it — the',
    '# extends block above already gives you all of this. Read it to see exactly',
    '# what you are adopting, or as a starting point if you would rather pin or',
    '# fork specific rules into your own config instead of extending the preset.',
    '#',
    '# `fix: false` on every rule below means what it says: detection-only, no',
    '# exceptions — see "How to tune it" above and PROVENANCE.md for why.',
    '',
    dumpYaml(doc),
  ].join('\n');
}

// -----------------------------------------------------------------------
// Public entry point shared by the CLI path and the drift test.
// -----------------------------------------------------------------------

export async function renderExample(name) {
  if (!PRESET_NAMES.includes(name)) {
    throw new Error(`generate-examples: unknown preset name "${name}"`);
  }
  const { validate } = await loadLib();
  const presetId = `recheck/${name}`;
  const { isValid, errors, rules } = await validate({ extends: [presetId] });
  if (!isValid) {
    throw new Error(
      `generate-examples: ${presetId} failed to resolve/validate: ${JSON.stringify(errors, null, 2)}`
    );
  }

  const header = renderHeader(name);
  const whatToPaste = renderWhatToPaste(name);
  const howToTune = renderHowToTune(name, rules);
  const fullExpansion = renderFullExpansion(presetId, rules);
  const appendix = (await readFile(appendixPath(name), 'utf8')).trimEnd();

  const raw = [header, whatToPaste, howToTune, fullExpansion, appendix].join('\n\n') + '\n';
  return formatWithOxfmt(raw);
}

// -----------------------------------------------------------------------
// CLI entry point.
// -----------------------------------------------------------------------

async function main() {
  const check = process.argv.includes('--check');
  const stale = [];

  for (const name of PRESET_NAMES) {
    const rendered = await renderExample(name);
    if (check) {
      let onDisk = '';
      try {
        onDisk = await readFile(examplePath(name), 'utf8');
      } catch {
        // treated as stale below
      }
      if (onDisk !== rendered) {
        stale.push(name);
      }
    } else {
      await mkdir(path.dirname(examplePath(name)), { recursive: true });
      await writeFile(examplePath(name), rendered, 'utf8');
      // oxlint-disable-next-line eslint/no-console -- this is a standalone CLI script; console output is its report to the developer running it.
      console.log(`wrote ${path.relative(packageRoot, examplePath(name))}`);
    }
  }

  if (check && stale.length > 0) {
    // oxlint-disable-next-line eslint/no-console -- this is a standalone CLI script; console output is its report to the developer running it.
    console.error(
      `Stale example(s): ${stale.join(', ')} — run \`node scripts/generate-examples.mjs\`.`
    );
    process.exitCode = 1;
  }
}

const isMain = path.resolve(process.argv[1] ?? '') === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((error) => {
    // oxlint-disable-next-line eslint/no-console -- this is a standalone CLI script; console output is its report to the developer running it.
    console.error(error);
    process.exitCode = 1;
  });
}
