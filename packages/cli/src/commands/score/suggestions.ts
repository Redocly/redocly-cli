import type { HotspotIssueCode, HotspotOperation } from './types.js';

const FOCUS_BY_CODE: Record<HotspotIssueCode, string[]> = {
  high_parameter_count: [
    'Reduce or consolidate parameters where possible (e.g. move complex filters into a request body object).',
    'Add clear descriptions and constraints (format, enum, pattern) for every parameter you keep.',
  ],
  deep_schema_nesting: [
    'Flatten or extract nested objects into `components.schemas` and reference them to reduce depth.',
    'Prefer clear property names and descriptions over deep anonymous nesting.',
  ],
  any_of_without_discriminator: [
    'Add a `discriminator` (and consistent `propertyName` / mapping) so clients can tell which `anyOf` branch applies.',
    'Document each branch and consider whether `oneOf` or separate operations would be clearer.',
  ],
  high_polymorphism_count: [
    'Simplify composition (`oneOf` / `anyOf` / `allOf`) where possible; split variants into distinct schemas or operations if that matches the domain.',
    'Ensure each variant is documented and, where appropriate, uses a discriminator.',
  ],
  missing_request_and_response_examples: [
    'Add `example` or `examples` to request and success-response media types that match your schemas.',
  ],
  missing_request_body_examples: [
    'Add `example` or `examples` under the request body media type so tools can show realistic payloads.',
  ],
  missing_response_examples: [
    'Add `example` or `examples` under success (and key error) response media types.',
  ],
  no_structured_error_responses: [
    'Define JSON (or other) response bodies for 4xx/5xx responses with schemas describing error codes, messages, and fields.',
    'Add descriptions explaining when each error occurs.',
  ],
  missing_operation_description: [
    'Add a concise `description` (and `summary` if useful) explaining purpose, side effects, and important caveats.',
  ],
  no_parameter_descriptions: [
    'Add a `description` for every parameter, including defaults, valid ranges, and interaction with other parameters.',
  ],
  high_dependency_depth: [
    'Review shared `$ref` chains across operations; extract reusable pieces but avoid forcing multi-step coupling where a single clearer contract is possible.',
  ],
  ambiguous_identifiers: [
    'Rename generic parameter names (`id`, `name`, `type`, …) to domain-specific names or add strong descriptions and constraints.',
  ],
};

function uniqueFocusLines(codes: Iterable<HotspotIssueCode>): string[] {
  const seen = new Set<HotspotIssueCode>();
  const lines: string[] = [];
  for (const code of codes) {
    if (seen.has(code)) continue;
    seen.add(code);
    for (const line of FOCUS_BY_CODE[code]) {
      lines.push(line);
    }
  }
  return lines;
}

function operationLabel(hotspot: HotspotOperation): string {
  const method = hotspot.method.toUpperCase();
  const base = `${method} ${hotspot.path}`;
  return hotspot.operationId ? `${base} (operationId: ${hotspot.operationId})` : base;
}

/**
 * Single copy-paste prompt for an LLM to improve one operation in the OpenAPI document.
 */
export function buildHotspotAgentPrompt(apiPath: string, hotspot: HotspotOperation): string {
  const bulletReasons = hotspot.reasons.map((r) => `- ${r}`).join('\n');
  const focusLines = uniqueFocusLines(hotspot.issues.map((i) => i.code));
  const focusBlock = focusLines.map((l) => `- ${l}`).join('\n');

  return [
    'You are helping improve an OpenAPI 3.x description for developer and AI-agent usability (clarity, examples, and schema structure).',
    '',
    `Document file: ${apiPath}`,
    `Target operation: ${operationLabel(hotspot)}`,
    `Current agent-readiness score for this operation (from Redocly CLI \`score\`, higher is better): ${hotspot.agentReadinessScore.toFixed(1)}/100`,
    '',
    'Issues detected:',
    bulletReasons,
    '',
    'Please edit the OpenAPI in place to address these issues. Prioritize:',
    focusBlock,
    '',
    'Keep changes coherent with the rest of the spec; preserve existing behavior contracts unless you are clearly fixing documentation or examples.',
  ].join('\n');
}
