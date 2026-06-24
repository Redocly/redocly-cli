import { stringifyYaml } from '@redocly/openapi-core';

import type { GeneratedDocument } from '../generator.js';
import type { TrafficSample } from '../samples.js';

const SYSTEM_INSTRUCTIONS = `You are an expert API designer. You are given:
1. A baseline OpenAPI 3.1 description that was inferred mechanically from recorded HTTP traffic. It is only a hypothesis: types are coarse, every observed property is marked required, descriptions are missing, and enums/formats are not detected.
2. A sample of the real recorded HTTP exchanges the baseline was derived from.

Your job is to refine the baseline into the most accurate OpenAPI 3.1 description you can justify from the evidence, while staying conservative:
- Keep the same paths, path parameters, methods and status codes that appear in the traffic. Do not invent endpoints that were never observed.
- Narrow property types where the samples clearly support it (formats such as date-time, uuid, email, uri; integer vs number; enums when a field only ever takes a small fixed set of values).
- Relax "required" for properties that are plausibly optional (e.g. absent in some samples, or clearly nullable).
- Add concise, useful "summary" and "description" fields to operations, parameters and important schema properties.
- Extract repeated response/request object shapes into components/schemas with meaningful names and reference them with $ref.
- Add example values drawn from the real samples where helpful.

Output ONLY the final OpenAPI 3.1 document as YAML. Do not wrap it in Markdown code fences. Do not add any commentary before or after the document.`;

function renderSamples(samples: TrafficSample[]): string {
  if (samples.length === 0) {
    return '(no sample exchanges were captured)';
  }
  return samples
    .map((sample, index) => {
      const lines: string[] = [];
      const query = sample.query ? `?${sample.query}` : '';
      lines.push(`### Exchange ${index + 1}`);
      lines.push(`${sample.method} ${sample.path}${query}`);
      if (sample.requestContentType) {
        lines.push(`Request Content-Type: ${sample.requestContentType}`);
      }
      if (sample.requestBody) {
        lines.push(`Request body: ${sample.requestBody}`);
      }
      if (sample.status !== undefined) {
        lines.push(`Response status: ${sample.status}`);
      }
      if (sample.responseContentType) {
        lines.push(`Response Content-Type: ${sample.responseContentType}`);
      }
      if (sample.responseBody) {
        lines.push(`Response body: ${sample.responseBody}`);
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

export interface BuildPromptOptions {
  baseline: GeneratedDocument;
  samples: TrafficSample[];
}

/**
 * Build a single self-contained prompt. The OpenAI provider splits it into a
 * system/user pair; the CLI providers (claude, codex) receive it whole on stdin.
 */
export function buildRefinementPrompt({ baseline, samples }: BuildPromptOptions): {
  system: string;
  user: string;
} {
  const user = `# Baseline OpenAPI description (inferred from traffic)

\`\`\`yaml
${stringifyYaml(baseline)}
\`\`\`

# Sample HTTP exchanges

${renderSamples(samples)}

Refine the baseline as instructed and output the improved OpenAPI 3.1 YAML only.`;

  return { system: SYSTEM_INSTRUCTIONS, user };
}
