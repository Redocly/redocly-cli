import { isPlainObject, stringifyYaml } from '@redocly/openapi-core';

// CI only exercises stub providers, so editing these instructions or the
// prompt layouts below can change workflow quality without failing any test.
function buildSystemInstructions(maxWorkflows: number): string {
  return `You are an expert in API testing and the Arazzo specification. You are given an OpenAPI description and a baseline Arazzo description that was generated mechanically from it: one workflow per operation, one step each, no dependencies between operations. Redesign the workflows so they reflect how the API is used in the real world.

Follow these rules:
- Reference operations exactly the way the baseline does: "operationId: $sourceDescriptions.<name>.<operationId>" for operations that have an operationId, or the baseline's "operationPath" value otherwise. Reference only operations that appear in the baseline. The result is programmatically checked and rejected otherwise.
- Group related operations into multi-step scenario workflows — for example create a resource, read it, update it, and delete it. A workflow may also be a single step when an operation stands alone.
- Prefer grouping operations that share a tag into the same workflow, and when scenarios are equally likely, follow the order in which operations appear in the description.
- Design at most ${maxWorkflows} workflow(s); this limit is programmatically checked. Prefer covering every operation from the baseline in at least one workflow; when the limit does not allow that, choose the operations that form the most likely real-world scenarios.
- When the API has authentication or token-issuing operations, run them first and pass their result to the steps that need it.
- When a step registers or configures an OAuth2 client, request every grant type the security scheme's flows declare (for example both authorization_code and client_credentials), so the example works with any declared flow.
- Prefer chains where every required parameter of a step comes from an earlier step's outputs, a workflow input, or a value documented in the OpenAPI description.
- Chain steps through runtime expressions: declare step "outputs" taken from the response (for example "id: $response.body#/id") and use them in later steps as "$steps.<stepId>.outputs.<name>".
- Declare workflow "inputs" as a JSON Schema for values a caller must provide and reference them as "$inputs.<name>".
- Keep the baseline step's "x-security" on every step that uses that operation, along with the security-related workflow "inputs" and "parameters", and keep the baseline "components" if present.
- Give every step "successCriteria" with a "$statusCode" check matching the response code the OpenAPI description documents for it.
- Use kebab-case for every workflowId and stepId, and give every workflow a short "summary" and "description".

Output ONLY a YAML document with this exact top-level structure:

workflows:
  - ...the redesigned workflows...
components:
  ...only when the baseline has components or new reusable inputs are needed; omit otherwise...

Do not output "arazzo", "info", or "sourceDescriptions" — they are added programmatically. Do not wrap the output in Markdown code fences. Do not add any commentary before or after the document.`;
}

const PROSE_KEYS = new Set(['description', 'example', 'examples', 'externalDocs']);

/**
 * Copy the description without its prose fields. Under a `properties` key the
 * keys are schema property names, not OpenAPI keywords — a property named
 * "description" must survive.
 */
export function stripProse(value: unknown, keysArePropertyNames = false): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripProse(item));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (!keysArePropertyNames && PROSE_KEYS.has(key)) {
      continue;
    }
    result[key] = stripProse(child, !keysArePropertyNames && key === 'properties');
  }
  return result;
}

export interface BuildWorkflowsPromptOptions {
  /** The bundled OpenAPI description the workflows are generated for. */
  description: unknown;
  /** The mechanically generated Arazzo description. */
  baseline: unknown;
  /** The most workflows the AI may design. */
  maxWorkflows: number;
}

/**
 * Build a single prompt covering the whole description: realistic workflows
 * chain operations together, so the AI needs the full picture rather than
 * one operation at a time.
 */
export function buildWorkflowsPrompt(options: BuildWorkflowsPromptOptions): {
  system: string;
  user: string;
} {
  const sections = [
    `# OpenAPI description\n\n\`\`\`yaml\n${stringifyYaml(options.description)}\`\`\``,
    `# Baseline Arazzo description (mechanically generated)\n\n\`\`\`yaml\n${stringifyYaml(
      options.baseline
    )}\`\`\``,
    'Redesign the workflows as instructed and output only the YAML document.',
  ];

  return { system: buildSystemInstructions(options.maxWorkflows), user: sections.join('\n\n') };
}

/** One operation of the description, as the scenario selection pass sees it. */
export interface OperationEntry {
  /** The step reference the baseline uses for this operation. */
  reference: string;
  method: string;
  path: string;
  summary?: string;
  tags?: string[];
}

function buildSelectionSystemInstructions(maxWorkflows: number): string {
  return `You are an expert in API testing. You are given the operation index of an OpenAPI description: every operation's reference, HTTP method, path, summary, and tags. Choose the real-world scenarios most worth testing.

Follow these rules:
- Choose at most ${maxWorkflows} scenario(s); this limit is programmatically checked.
- A scenario is an ordered list of operations that exercise one realistic flow — for example create a resource, read it, update it, and delete it. A scenario may also be a single operation when it stands alone.
- Use only operation references that appear in the index, exactly as written. The result is programmatically checked and rejected otherwise.
- Put authentication or token-issuing operations first in every scenario that needs them.
- Prefer grouping operations that share a tag, and when scenarios are equally likely, follow the index order.
- Give every scenario a unique kebab-case "workflowId" and a short "summary".

Output ONLY a YAML document with this exact structure:

scenarios:
  - workflowId: ...
    summary: ...
    operations:
      - ...operation references...

Do not wrap the output in Markdown code fences. Do not add any commentary before or after the document.`;
}

/**
 * Build the first pass of large-description mode: a compact operation index
 * the AI picks scenarios from, instead of the full description.
 */
export function buildScenarioSelectionPrompt(options: {
  entries: OperationEntry[];
  maxWorkflows: number;
}): { system: string; user: string } {
  const index = options.entries
    .map((entry) => {
      const summary = entry.summary ? ` — ${entry.summary}` : '';
      const tags = entry.tags?.length ? ` [${entry.tags.join(', ')}]` : '';
      return `- ${entry.reference} — ${entry.method.toUpperCase()} ${entry.path}${summary}${tags}`;
    })
    .join('\n');

  return {
    system: buildSelectionSystemInstructions(options.maxWorkflows),
    user: `# Operation index\n\n${index}\n\nChoose the scenarios as instructed and output only the YAML document.`,
  };
}

const DESIGN_SYSTEM_INSTRUCTIONS = `You are an expert in API testing and the Arazzo specification. Design exactly ONE Arazzo workflow for the given scenario, using the OpenAPI operations provided.

Follow these rules:
- Use the given "workflowId" exactly.
- Reference operations exactly the way the baseline workflows do, and use only the operations provided. The result is programmatically checked and rejected otherwise.
- Chain steps through runtime expressions: declare step "outputs" taken from the response (for example "id: $response.body#/id") and use them in later steps as "$steps.<stepId>.outputs.<name>".
- Declare workflow "inputs" as a JSON Schema for values a caller must provide and reference them as "$inputs.<name>".
- Keep the baseline step's "x-security" on every step that uses that operation, along with the security-related workflow "inputs" and "parameters".
- When a step registers or configures an OAuth2 client, request every grant type the security scheme's flows declare, so the example works with any declared flow.
- Give every step "successCriteria" with a "$statusCode" check matching the response code the OpenAPI description documents for it.
- Use kebab-case for every stepId, and give the workflow a short "summary" and "description".

Output ONLY a YAML document with this exact top-level structure:

workflows:
  - ...the single designed workflow...

Do not output "arazzo", "info", "sourceDescriptions", or "components" — they are added programmatically. Do not wrap the output in Markdown code fences. Do not add any commentary before or after the document.`;

/**
 * Build the second pass of large-description mode: design one scenario's
 * workflow from only its operations, so the prompt stays small no matter how
 * large the description is.
 */
export function buildScenarioDesignPrompt(options: {
  workflowId: string;
  summary?: string;
  /** The description sliced down to the scenario's operations. */
  description: unknown;
  /** The baseline workflows covering the scenario's operations. */
  baselineWorkflows: unknown[];
  /** The baseline components (reusable security inputs), when present. */
  components?: unknown;
}): { system: string; user: string } {
  const sections = [
    `# Scenario\n\nworkflowId: ${options.workflowId}${
      options.summary ? `\nsummary: ${options.summary}` : ''
    }`,
    `# OpenAPI operations for this scenario\n\n\`\`\`yaml\n${stringifyYaml(
      options.description
    )}\`\`\``,
    `# Baseline workflows for these operations (mechanically generated)\n\n\`\`\`yaml\n${stringifyYaml(
      { workflows: options.baselineWorkflows }
    )}\`\`\``,
  ];
  if (options.components !== undefined) {
    sections.push(
      `# Reusable inputs components (added programmatically to the final document)\n\n\`\`\`yaml\n${stringifyYaml(
        { components: options.components }
      )}\`\`\``
    );
  }
  sections.push('Design the workflow as instructed and output only the YAML document.');

  return { system: DESIGN_SYSTEM_INSTRUCTIONS, user: sections.join('\n\n') };
}
