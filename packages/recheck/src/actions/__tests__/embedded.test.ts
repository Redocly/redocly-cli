import { describe, expect, it } from 'vitest';

import { resolveRecheckConfig } from '../../config/resolve.js';
import { lintEmbeddedInputs, type EmbeddedInput } from '../embedded.js';

async function rules() {
  const result = await resolveRecheckConfig({
    extends: ['recheck/markdown'],
    block: {},
    configDir: process.cwd(),
  });
  if (!result.success) throw new Error('config');
  return result.config;
}

function input(content: string, overrides: Partial<EmbeddedInput> = {}): EmbeddedInput {
  return {
    file: '/api/openapi.yaml',
    pointer: '#/info/description',
    content,
    mapPosition: (line, column) => ({ line: line + 40, column: column + 8 }),
    ...overrides,
  };
}

describe('lintEmbeddedInputs', () => {
  it('remaps positions and carries the pointer', async () => {
    const config = await rules();
    const { problems } = await lintEmbeddedInputs(
      [input(`Intro.\n${'lorem ipsum dolor sit amet '.repeat(6).trim()}\n`)],
      config.descriptionRules,
      {
        knownRuleNames: new Set(config.rules.map((rule) => rule.name)),
        markdoc: false,
        markdocSchema: null,
      }
    );
    const long = problems.find((problem) => problem.ruleName === 'recheck/line-length');
    expect(long).toBeDefined();
    expect(long!.line).toBe(42);
    expect(long!.column).toBeGreaterThan(8);
    expect(long!.file).toBe('/api/openapi.yaml');
    expect(long!.pointer).toBe('#/info/description');
  });

  it('drops document-shape rules for embedded content', async () => {
    const config = await rules();
    const { problems } = await lintEmbeddedInputs(
      [input('Plain text without a heading.\n')],
      config.descriptionRules,
      {
        knownRuleNames: new Set(config.rules.map((rule) => rule.name)),
        markdoc: false,
        markdocSchema: null,
      }
    );
    expect(problems.map((problem) => problem.ruleName)).not.toContain('recheck/first-line-h1');
  });

  it('counts fixable findings without applying fixes', async () => {
    const config = await rules();
    const { problems, fixableCount } = await lintEmbeddedInputs(
      [input('Trailing spaces here.   \n')],
      config.descriptionRules,
      {
        knownRuleNames: new Set(config.rules.map((rule) => rule.name)),
        markdoc: false,
        markdocSchema: null,
      }
    );
    expect(fixableCount).toBe(problems.filter((problem) => problem.fixable).length);
    expect(fixableCount).toBeGreaterThan(0);
  });
});
