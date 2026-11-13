import { runRules, type RunnerOptions } from '../core/runner.js';
import type { NormalizedRule, Problem } from '../types/index.js';

// One description extracted from an API document. `content` is the parsed
// string value; `mapPosition` turns a line and column inside it into the
// source position of the owning file.
export interface EmbeddedInput {
  file: string;
  pointer: string;
  content: string;
  mapPosition(line: number, column: number): { line: number; column: number };
}

// Lints each input on its own in embedded mode and remaps every finding to
// the owning file. Fixes never apply to embedded content.
export async function lintEmbeddedInputs(
  inputs: EmbeddedInput[],
  rules: NormalizedRule[],
  runnerOptions: RunnerOptions
): Promise<{ problems: Problem[]; fixableCount: number }> {
  const problems: Problem[] = [];
  let fixableCount = 0;
  for (const input of inputs) {
    const result = await runRules([{ path: input.file, content: input.content }], rules, {
      ...runnerOptions,
      embedded: true,
    });
    for (const problem of result.problems) {
      const position = input.mapPosition(problem.line, problem.column);
      if (problem.fixable) fixableCount++;
      problems.push({
        ...problem,
        line: position.line,
        column: position.column,
        pointer: input.pointer,
      });
    }
  }
  return { problems, fixableCount };
}
