import { readFile } from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it, beforeAll } from 'vitest';

import { lintContent } from '../../index.js';
import type { Problem } from '../../types/index.js';
import { presets } from '../presets/index.js';
import { MARKDOC_PRESET_RULE_NAMES, MARKDOC_VIOLATION_CLASSES } from '../presets/markdoc.js';
import { resolveExtends, validate } from '../validate.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
function fixture(name: string): string {
  return path.join(dir, 'fixtures', name);
}

// `markdoc-attributes` is configured as an error, but reports an unknown attribute as a warning.
// That is only visible in the lint results, so it is checked further down.
describe('recheck/markdoc preset shape', () => {
  const preset = presets['recheck/markdoc'];

  it('ships exactly the four Markdoc AST rules, nothing else', () => {
    expect(Object.keys(preset).sort()).toEqual([...MARKDOC_PRESET_RULE_NAMES].sort());
  });

  it('recheck/markdoc-syntax and recheck/markdoc-pairing are severity: error', () => {
    expect(preset['recheck/markdoc-syntax'].severity).toBe('error');
    expect(preset['recheck/markdoc-pairing'].severity).toBe('error');
  });

  it('recheck/markdoc-unknown-tag is severity: warn (custom tags are common)', () => {
    expect(preset['recheck/markdoc-unknown-tag'].severity).toBe('warn');
  });

  it('recheck/markdoc-attributes is configured at severity: error (the majority/structural case)', () => {
    expect(preset['recheck/markdoc-attributes'].severity).toBe('error');
  });

  it('every rule is fix: false (detection-only)', () => {
    for (const rule of Object.values(preset)) {
      expect(rule.fix).toBe(false);
    }
  });

  it("every rule's message matches its own token rule's defaults.message exactly (no independent wording to drift)", () => {
    expect(preset['recheck/markdoc-syntax'].message).toBe('Markdoc syntax error');
    expect(preset['recheck/markdoc-pairing'].message).toBe('%s');
    expect(preset['recheck/markdoc-unknown-tag'].message).toBe('%s');
    expect(preset['recheck/markdoc-attributes'].message).toBe('%s');
  });
});

// Every violation class must be reported at least once, not just every rule. A class without a
// matcher below, or a matcher without a class, fails the test.
describe('markdoc-violations.md: per-violation-class coverage gate', () => {
  // One matcher per MARKDOC_VIOLATION_CLASSES entry, with the same id. `unknown-attr` excludes the
  // primary-quoted form, because both messages contain "is not a known attribute of".
  const CLASS_MATCHERS: Record<string, (message: string) => boolean> = {
    malformed: (m) => m.includes('expected an attribute name'),
    'close-tag-attributes': (m) => m.includes('must not carry attributes'),
    'primary-bareword': (m) => m.includes('quote the value: {% if "maybe" %}'),
    'attribute-bareword': (m) => m.includes('quote the value: type="info"'),
    unclosed: (m) => m.includes('is opened here but never closed'),
    orphaned: (m) => m.includes('no well-formed matching open was found'),
    crossed: (m) => m.includes('interleaved (crossed)'),
    'void-missing-slash': (m) => m.includes('is self-closing — write {% img /%}'),
    'self-closing-with-close': (m) => m.includes('must not be used with a matching'),
    'unknown-tag': (m) => m.includes('is not a known Markdoc tag'),
    'primary-unknown-attribute': (m) => m.includes('"primary" is not a known attribute of'),
    'wrong-type': (m) => m.includes('must be a number value'),
    enum: (m) => m.includes('must be one of'),
    'unknown-attr': (m) =>
      m.includes('is not a known attribute of') && !m.includes('"primary" is not a known'),
    'missing-required': (m) => m.includes('is missing its required'),
    'duplicate-attribute': (m) => m.includes('is already set earlier on this tag'),
  };

  // Lint the fixture once. The tests below only read the problems.
  let problems: Problem[];
  beforeAll(async () => {
    const content = await readFile(fixture('markdoc-violations.md'), 'utf8');
    problems = await lintContent(content, {
      extends: ['recheck/markdoc'],
      markdoc: true,
    });
  });

  it('MARKDOC_VIOLATION_CLASSES and the test matchers name exactly the same classes', () => {
    expect(Object.keys(CLASS_MATCHERS).sort()).toEqual([...MARKDOC_VIOLATION_CLASSES].sort());
  });

  it('every violation class fires at least once on the shared fixture', () => {
    const misses: string[] = [];
    for (const violationClass of MARKDOC_VIOLATION_CLASSES) {
      const matcher = CLASS_MATCHERS[violationClass];
      const hit = problems.some((p) => matcher(p.message));
      if (!hit) misses.push(violationClass);
    }
    expect(misses, `violation class(es) never fired: ${misses.join(', ')}`).toEqual([]);
  });

  it('markdoc-attributes reports unknown attributes (named or primary) as warn and everything else as error', () => {
    const attributeProblems = problems.filter((p) => p.ruleName === 'recheck/markdoc-attributes');
    expect(attributeProblems.length).toBeGreaterThan(0);

    const isUnknownAttribute = (p: Problem) => p.message.includes('is not a known attribute of');
    for (const p of attributeProblems) {
      // The message is in a template literal because oxlint only allows a string or template literal there.
      expect(p.severity, `${p.message}`).toBe(isUnknownAttribute(p) ? 'warn' : 'error');
    }
    // The fixture must produce both kinds, or the loop above proves nothing.
    expect(attributeProblems.some((p) => isUnknownAttribute(p) && p.severity === 'warn')).toBe(
      true
    );
    expect(attributeProblems.some((p) => !isUnknownAttribute(p) && p.severity === 'error')).toBe(
      true
    );
  });

  it('markdoc-syntax and markdoc-pairing findings are all severity: error', () => {
    const syntaxAndPairing = problems.filter(
      (p) => p.ruleName === 'recheck/markdoc-syntax' || p.ruleName === 'recheck/markdoc-pairing'
    );
    expect(syntaxAndPairing.length).toBeGreaterThan(0);
    for (const p of syntaxAndPairing) expect(p.severity, `${p.message}`).toBe('error');
  });

  it('markdoc-unknown-tag findings are all severity: warn', () => {
    const unknownTag = problems.filter((p) => p.ruleName === 'recheck/markdoc-unknown-tag');
    expect(unknownTag.length).toBeGreaterThan(0);
    for (const p of unknownTag) expect(p.severity, `${p.message}`).toBe('warn');
  });
});

// The test above only checks the listed classes. This one counts report calls in the rule sources
// and compares the total to the list length, so a new unlisted violation class fails here.
// Most rules collect problems in a `reports` array and flush it in one loop. That loop is not a
// class, so it is subtracted. `markdoc-syntax.ts` reports directly and has none to subtract.
describe('MARKDOC_VIOLATION_CLASSES matches actual report call sites in source', () => {
  const ruleDir = path.join(dir, '..', '..', 'rules', 'token');
  const RULE_FILES = [
    'markdoc-syntax.ts',
    'markdoc-pairing.ts',
    'markdoc-unknown-tag.ts',
    'markdoc-attributes.ts',
  ];

  it("one MARKDOC_VIOLATION_CLASSES entry per reports.push(/ctx.onError( call site, minus each file's own emit-loop flush", async () => {
    let totalCallSites = 0;
    for (const file of RULE_FILES) {
      const source = await readFile(path.join(ruleDir, file), 'utf8');
      const pushCount = (source.match(/\breports\.push\(/g) ?? []).length;
      const onErrorCount = (source.match(/\bctx\.onError\(/g) ?? []).length;
      const emitLoopCount = (source.match(/for\s*\(\s*const\s+\w+\s+of\s+reports\s*\)/g) ?? [])
        .length;
      totalCallSites += pushCount + onErrorCount - emitLoopCount;
    }

    expect(totalCallSites).toBe(MARKDOC_VIOLATION_CLASSES.length);
  });
});

describe('markdoc-clean.md reports zero findings', () => {
  it('realistic tagged prose (admonition/tabs/tab/partial/img, all correct) reports nothing', async () => {
    const content = await readFile(fixture('markdoc-clean.md'), 'utf8');
    const problems = await lintContent(content, {
      extends: ['recheck/markdoc'],
      markdoc: true,
    });
    expect(problems).toEqual([]);
  });

  it('reports nothing even under a stacked extends (recheck/markdown + recheck/markdoc)', async () => {
    const content = await readFile(fixture('markdoc-clean.md'), 'utf8');
    const problems = await lintContent(content, {
      extends: ['recheck/markdown', 'recheck/markdoc'],
      markdoc: true,
    });
    // Only the four markdoc rules are checked. `recheck/markdown` may report other things here.
    const markdocProblems = problems.filter((p) => p.ruleName.startsWith('recheck/markdoc-'));
    expect(markdocProblems).toEqual([]);
  });
});

// The two presets have no rule keys in common, so stacking them keeps every severity.
describe('composition: extends [recheck/markdown, recheck/markdoc]', () => {
  it('resolves with every rule key from both presets present, no collisions', () => {
    const { config, errors } = resolveExtends({
      extends: ['recheck/markdown', 'recheck/markdoc'],
    });
    expect(errors).toEqual([]);

    const markdownKeys = Object.keys(presets['recheck/markdown']);
    const markdocKeys = Object.keys(presets['recheck/markdoc']);
    const overlap = markdownKeys.filter((k) => markdocKeys.includes(k));
    expect(overlap).toEqual([]);

    const mergedKeys = new Set(Object.keys(config));
    for (const key of [...markdownKeys, ...markdocKeys]) {
      expect(mergedKeys.has(key), `expected merged config to contain "${key}"`).toBe(true);
    }
    expect(Object.keys(config).length).toBe(markdownKeys.length + markdocKeys.length);
  });

  it("preserves recheck/markdoc's own severities through the merge", () => {
    const { config } = resolveExtends({ extends: ['recheck/markdown', 'recheck/markdoc'] });
    for (const [key, rule] of Object.entries(presets['recheck/markdoc'])) {
      expect(config[key]?.severity, `"${key}" severity should survive the merge`).toBe(
        rule.severity
      );
    }
  });

  it('resolves end-to-end via validate() with markdoc: true, and a markdoc rule actually fires', async () => {
    const result = await validate({
      extends: ['recheck/markdown', 'recheck/markdoc'],
      markdoc: true,
    });
    expect(result.isValid).toBe(true);
    expect(result.markdoc.enabled).toBe(true);
    expect(result.rules.some((r) => r.name === 'recheck/markdoc-attributes')).toBe(true);

    const content = await readFile(fixture('markdoc-violations.md'), 'utf8');
    const problems = await lintContent(content, {
      extends: ['recheck/markdown', 'recheck/markdoc'],
      markdoc: true,
    });
    expect(problems.some((p) => p.ruleName === 'recheck/markdoc-attributes')).toBe(true);
  });
});

// Extending recheck/markdoc without turning markdoc parsing on is valid but warns, because the
// four rules would never fire.
describe('stale-preset warning: recheck/markdoc extended with markdoc off', () => {
  it('warns when markdoc is absent entirely', async () => {
    const warnings: string[] = [];
    const result = await validate(
      { extends: ['recheck/markdoc'] },
      { warn: (message) => warnings.push(message) }
    );
    expect(result.isValid).toBe(true);
    expect(
      warnings.some((message) =>
        message.includes('extends "recheck/markdoc" but "markdoc" parsing is off')
      )
    ).toBe(true);
  });

  it('warns when markdoc is explicitly false', async () => {
    const warnings: string[] = [];
    const result = await validate(
      { extends: ['recheck/markdoc'], markdoc: false },
      { warn: (message) => warnings.push(message) }
    );
    expect(result.isValid).toBe(true);
    expect(
      warnings.some((message) =>
        message.includes('extends "recheck/markdoc" but "markdoc" parsing is off')
      )
    ).toBe(true);
  });

  it('does NOT warn when markdoc: true is set alongside the preset', async () => {
    const warnings: string[] = [];
    const result = await validate(
      { extends: ['recheck/markdoc'], markdoc: true },
      { warn: (message) => warnings.push(message) }
    );
    expect(result.isValid).toBe(true);
    expect(
      warnings.some((message) =>
        message.includes('extends "recheck/markdoc" but "markdoc" parsing is off')
      )
    ).toBe(false);
  });

  it('does NOT warn for a config that never extends recheck/markdoc at all', async () => {
    const warnings: string[] = [];
    const result = await validate(
      { extends: ['recheck/markdown'] },
      { warn: (message) => warnings.push(message) }
    );
    expect(result.isValid).toBe(true);
    expect(
      warnings.some((message) => message.includes('recheck/markdoc" but "markdoc" parsing is off'))
    ).toBe(false);
  });

  it('does NOT warn for a config with no extends at all', async () => {
    const warnings: string[] = [];
    const result = await validate({}, { warn: (message) => warnings.push(message) });
    expect(result.isValid).toBe(true);
    expect(warnings).toHaveLength(0);
  });
});
