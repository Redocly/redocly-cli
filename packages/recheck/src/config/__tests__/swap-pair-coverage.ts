import { presetConfig } from '../../__tests__/preset-block.js';
import { lintContent } from '../../index.js';
import type { ConsistencyAssertion, SwapAssertion } from '../../types/index.js';
import { presets } from '../presets/index.js';

// Some keys of a `keysAreRegex` rule are plain text (for example `click on`). Only keys with regex
// syntax need a trigger text registered by the caller.
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

/**
 * Lints one document that holds a trigger text for every `swap` pair and `consistency` pair of a
 * preset, and returns a message for each pair that was never reported. The document is built from
 * the live preset, so added or removed pairs are covered without editing a fixture.
 *
 * `regexKeyExamples` gives the literal trigger text of each regex key, by rule name and regex
 * source. A regex key without an entry is returned as a message naming the key.
 */
export async function unreportedPairs(
  presetId: string,
  regexKeyExamples: Record<string, Record<string, string>>
): Promise<string[]> {
  const cases: CoverageCase[] = [];
  const messages: string[] = [];

  for (const [ruleName, rule] of Object.entries(presets[presetId])) {
    const headingOnly = rule.scope === 'heading';
    const swapOptions = rule.assertions['swap'] as SwapAssertion | undefined;
    for (const key of Object.keys(swapOptions?.pairs ?? {})) {
      const registeredExample = regexKeyExamples[ruleName]?.[key];
      if (registeredExample !== undefined) {
        cases.push({ ruleName, configKey: key, example: registeredExample, headingOnly });
      } else if (swapOptions?.keysAreRegex && RAW_REGEX_SYNTAX.test(key)) {
        messages.push(
          `${ruleName}: no trigger text registered for regex key ${JSON.stringify(key)}`
        );
      } else {
        cases.push({ ruleName, configKey: key, example: key, headingOnly });
      }
    }

    const consistencyOptions = rule.assertions['consistency'] as ConsistencyAssertion | undefined;
    for (const [key, value] of Object.entries(consistencyOptions?.either ?? {})) {
      cases.push({ ruleName, configKey: key, example: key, preamble: String(value) });
    }
  }
  if (cases.length === 0) throw new Error(`${presetId} has no swap or consistency pairs to cover`);

  // One paragraph per case, plus an earlier paragraph for `consistency` cases, so trigger texts
  // cannot overlap. `headingOnly` cases go in a heading line, because heading rules never see
  // paragraph text.
  const blocks: string[] = [];
  cases.forEach((coverageCase, index) => {
    if (coverageCase.preamble !== undefined) {
      blocks.push(
        `Coverage preamble ${index}: sample text with ${coverageCase.preamble} inside it.`
      );
    }
    blocks.push(
      coverageCase.headingOnly
        ? `## Coverage case ${index} with ${coverageCase.example} inside it`
        : `Coverage case ${index}: sample text with ${coverageCase.example} inside it.`
    );
  });
  const problems = await lintContent(
    ['# Per-pair coverage', '', blocks.join('\n\n')].join('\n'),
    await presetConfig([presetId])
  );

  const reported = new Set(
    problems.map((problem) => `${problem.ruleName}\u0000${problem.match.toLowerCase()}`)
  );
  for (const { ruleName, configKey, example } of cases) {
    if (!reported.has(`${ruleName}\u0000${example.toLowerCase()}`)) {
      messages.push(
        `${ruleName}: pair ${JSON.stringify(configKey)} (trigger text ${JSON.stringify(example)}) was never reported`
      );
    }
  }
  return messages;
}
