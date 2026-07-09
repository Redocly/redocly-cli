import { stringifyYaml } from '@redocly/openapi-core';

import type { GeneratedDocument } from '../generator.js';
import type { TrafficSample } from '../samples.js';

const SYSTEM_INSTRUCTIONS = `You are an expert API designer. You are given:
1. A baseline OpenAPI 3.1 description that was inferred mechanically from recorded HTTP traffic. It is only a hypothesis: types are coarse, every observed property is marked required, and descriptions are missing. Alternative body shapes observed in the traffic appear as "oneOf" variants or type unions. Object shapes that repeat across operations are already extracted into components/schemas and referenced with $ref. Common string formats (uuid, date-time, date, email, uri, ipv4) and small closed enums are detected conservatively from the observed values.
2. A sample of the real recorded HTTP exchanges the baseline was derived from.

Your job is to refine the baseline into the most accurate OpenAPI 3.1 description you can justify from the evidence, while staying conservative:
- Keep every path, operation and status code from the baseline. Do not invent endpoints that were never observed, do not drop or rename any operation, and keep path items inline (do not $ref whole path items). The result is programmatically checked against the baseline and rejected if an operation is missing.
- Narrow property types where the samples clearly support it (formats such as date-time, uuid, email, uri; integer vs number; enums when a field only ever takes a small fixed set of values). Verify the formats and enums the baseline already detected against the samples; correct or extend them where justified.
- Relax "required" for properties that are plausibly optional (e.g. absent in some samples, or clearly nullable). Express nullable values as type unions such as ["string", "null"].
- When a request or response body has alternative shapes — the baseline shows "oneOf" variants, or the samples show clearly different payloads for the same operation — model them explicitly with "oneOf". Name each variant in components/schemas, and add a "discriminator" when a property (such as "type" or "kind") selects the variant.
- Factor structure shared between variants or schemas with "allOf": extract the common base into components/schemas and compose each variant as "allOf" of the base plus its specific properties.
- Keep the components/schemas the baseline already extracted, referenced with $ref. Rename a component when a clearly better name exists, and extract further repeated shapes the baseline missed.
- Add concise, useful "summary" and "description" fields to operations, parameters and important schema properties.
- Add example values drawn from the real samples where helpful.

The result must be a structurally valid OpenAPI 3.1 document: it is linted before being accepted.

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
