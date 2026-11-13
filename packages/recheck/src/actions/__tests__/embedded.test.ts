import { describe, expect, it } from 'vitest';

import { presetBlock } from '../../__tests__/preset-block.js';
import { resolveRecheckConfig, type ResolvedRecheckConfig } from '../../config/resolve.js';
import { lintEmbeddedInputs, type EmbeddedInput } from '../embedded.js';

async function resolve(preset = 'recheck/markdown'): Promise<ResolvedRecheckConfig> {
  const result = await resolveRecheckConfig({
    block: await presetBlock([preset]),
    configDir: process.cwd(),
  });
  if (!result.success) throw new Error('config');
  return result.config;
}

function lint(config: ResolvedRecheckConfig, content: string) {
  const input: EmbeddedInput = {
    file: '/api/openapi.yaml',
    pointer: '#/info/description',
    content,
    mapPosition: (line, column) => ({ line: line + 40, column: column + 8 }),
  };
  return lintEmbeddedInputs([input], config.descriptionRules, {
    knownRuleNames: new Set(config.rules.map((rule) => rule.name)),
    markdoc: false,
    markdocSchema: null,
  });
}

describe('lintEmbeddedInputs', () => {
  // On a page, this text breaks `first-line-h1` under both presets.
  it.each(['recheck/markdown', 'recheck/google'])(
    'drops document-shape rules under %s',
    async (preset) => {
      const { problems } = await lint(await resolve(preset), 'Plain text without a heading.\n');
      expect(problems).toEqual([]);
    }
  );

  it('counts fixable findings without applying fixes', async () => {
    const { problems, fixableCount } = await lint(await resolve(), 'Trailing spaces here.   \n');
    expect(problems.map((problem) => [problem.ruleName, problem.fixable])).toEqual([
      ['recheck/no-trailing-spaces', true],
    ]);
    expect(fixableCount).toBe(1);
  });
});
