import { type Config, lintFromString } from '@redocly/openapi-core';

/** Strip Markdown code fences the model may have added despite instructions. */
export function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:ya?ml|json)?\s*\n([\s\S]*?)\n```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

/** Reject an AI-produced document that does not pass validation. */
export async function lintDocumentSource(source: string, config: Config): Promise<void> {
  const problems = await lintFromString({ source, config });
  const errors = problems.filter((problem) => problem.severity === 'error');
  if (errors.length > 0) {
    const summary = errors
      .slice(0, 5)
      .map((problem) => `${problem.ruleId}: ${problem.message}`)
      .join('; ');
    throw new Error(`the result has ${errors.length} validation problem(s): ${summary}`);
  }
}
