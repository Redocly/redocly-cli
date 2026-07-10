import { stringifyYaml } from '@redocly/openapi-core';

import type { TrafficSample } from '../samples.js';

const SYSTEM_INSTRUCTIONS = `You are an expert API designer. You are given one operation from an OpenAPI 3.1 description that was inferred mechanically from recorded HTTP traffic, the component schemas it references, and a sample of the real recorded HTTP exchanges for that operation. The inferred description is only a hypothesis: types are coarse, every observed property is marked required, and descriptions are missing. Alternative body shapes observed in the traffic appear as "oneOf" variants or type unions. Common string formats (uuid, date-time, date, email, uri, ipv4) and small closed enums are detected conservatively from the observed values.

Refine the operation into the most accurate OpenAPI 3.1 definition you can justify from the evidence, while staying conservative:
- Keep the path template and the HTTP method exactly as given. Do not rename path parameters, do not move parameters to the path item level, and keep every response status code. The result is programmatically checked and rejected otherwise.
- Keep the operationId unless it is clearly wrong.
- Narrow property types where the samples clearly support it (formats such as date-time, uuid, email, uri; integer vs number; enums when a field only ever takes a small fixed set of values). Verify the formats and enums already detected against the samples; correct or extend them where justified.
- Relax "required" for properties that are plausibly optional (e.g. absent in some samples, or clearly nullable). Express nullable values as type unions such as ["string", "null"].
- When a request or response body has alternative shapes — the baseline shows "oneOf" variants, or the samples show clearly different payloads — model them explicitly with "oneOf". Name each variant in components/schemas, and add a "discriminator" when a property (such as "type" or "kind") selects the variant.
- Factor structure shared between variants or schemas with "allOf": extract the common base into components/schemas and compose each variant as "allOf" of the base plus its specific properties.
- Keep the $ref references to the component schemas you were given. You may refine the definition of a referenced component when the samples justify it, and you may add new components, but never rename an existing component and never reuse a reserved component name listed in the input.
- Add concise, useful "summary" and "description" fields to the operation, its parameters and important schema properties.
- Add example values drawn from the real samples where helpful.

Output ONLY a YAML document with this exact top-level structure:

paths:
  <the path template exactly as given>:
    <the method>:
      ...the refined operation...
components:
  schemas:
    ...only the component schemas you changed or added; omit "components" entirely when there are none...

Do not wrap the output in Markdown code fences. Do not add any commentary before or after the document.`;

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

export interface BuildOperationPromptOptions {
  path: string;
  method: string;
  operation: unknown;
  /** Current definitions of the components the operation references (transitively). */
  components: Record<string, unknown>;
  /** Names of all other components in the description; the AI must not reuse them. */
  reservedComponentNames: string[];
  samples: TrafficSample[];
}

/**
 * Build a self-contained prompt for refining a single operation. The claude
 * and cursor providers receive the instructions and the content separately;
 * codex receives them concatenated on stdin.
 */
export function buildOperationPrompt(options: BuildOperationPromptOptions): {
  system: string;
  user: string;
} {
  const sections: string[] = [];

  sections.push(
    `# Operation to refine (inferred from traffic)\n\n\`\`\`yaml\n${stringifyYaml({
      paths: { [options.path]: { [options.method]: options.operation } },
    })}\`\`\``
  );

  if (Object.keys(options.components).length > 0) {
    sections.push(
      `# Component schemas referenced by this operation (current definitions)\n\n\`\`\`yaml\n${stringifyYaml(
        { components: { schemas: options.components } }
      )}\`\`\``
    );
  }

  if (options.reservedComponentNames.length > 0) {
    sections.push(
      `# Reserved component names (used elsewhere in the description; do not redefine or reuse them)\n\n${options.reservedComponentNames.join(
        ', '
      )}`
    );
  }

  sections.push(
    `# Recorded HTTP exchanges for this operation\n\n${renderSamples(options.samples)}`
  );
  sections.push(
    `Refine ${options.method.toUpperCase()} ${options.path} as instructed and output only the YAML document.`
  );

  return { system: SYSTEM_INSTRUCTIONS, user: sections.join('\n\n') };
}
