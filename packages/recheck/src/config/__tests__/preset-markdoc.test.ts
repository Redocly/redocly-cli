import { readFile } from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it, beforeAll } from 'vitest';

import { lintContent } from '../../index.js';
import type { Problem } from '../../types/index.js';
import { presets } from '../presets/index.js';
import { validate } from '../validate.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
function fixture(name: string): string {
  return path.join(dir, 'fixtures', name);
}

// Every kind of violation the four rules report must fire at least once on the shared fixture, not
// just every rule.
describe('markdoc-violations.md: per-violation-class coverage gate', () => {
  // `unknown-attr` excludes the primary-quoted form, because both messages contain "is not a known
  // attribute of".
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

  it('every violation class fires at least once on the shared fixture, and every rule reports', () => {
    const misses = Object.entries(CLASS_MATCHERS)
      .filter(([, matches]) => !problems.some((problem) => matches(problem.message)))
      .map(([violationClass]) => violationClass);
    expect(misses, `violation class(es) never fired: ${misses.join(', ')}`).toEqual([]);

    const reported = new Set(problems.map((problem) => problem.ruleName));
    expect(Object.keys(presets['recheck/markdoc']).filter((key) => !reported.has(key))).toEqual([]);
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

describe('composition: extends [recheck/markdown, recheck/markdoc]', () => {
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
  it.each([
    ['markdoc is absent', { extends: ['recheck/markdoc'] }, true],
    ['markdoc is false', { extends: ['recheck/markdoc'], markdoc: false }, true],
    ['markdoc is true', { extends: ['recheck/markdoc'], markdoc: true }, false],
    ['the config does not extend recheck/markdoc', { extends: ['recheck/markdown'] }, false],
    ['the config has no extends', {}, false],
  ])('when %s', async (_label, config, shouldWarn) => {
    const warnings: string[] = [];
    const result = await validate(config, { warn: (message) => warnings.push(message) });
    expect(result.isValid).toBe(true);
    expect(
      warnings.some((message) =>
        message.includes('extends "recheck/markdoc" but "markdoc" parsing is off')
      )
    ).toBe(shouldWarn);
  });
});
