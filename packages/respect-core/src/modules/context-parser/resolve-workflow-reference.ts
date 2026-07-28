import { type RuntimeExpressionContext, type TestContext, type Workflow } from '../../types.js';

// $sourceDescriptions.<name>.<workflowId> (Arazzo spec form)
// $sourceDescriptions.<name>.workflows.<workflowId> (legacy form)
export function parseSourceDescriptionWorkflowRef(
  ref: string
): { sourceDescriptionName: string; workflowId: string; isLegacyForm: boolean } | undefined {
  if (!ref.startsWith('$sourceDescriptions.')) {
    return undefined;
  }

  const parts = ref.split('.');

  if (parts.length === 3 && parts[1] && parts[2]) {
    return { sourceDescriptionName: parts[1], workflowId: parts[2], isLegacyForm: false };
  }

  if (parts.length === 4 && parts[2] === 'workflows' && parts[1] && parts[3]) {
    return { sourceDescriptionName: parts[1], workflowId: parts[3], isLegacyForm: true };
  }

  return undefined;
}

export function resolveWorkflowReference({
  ref,
  ctx,
}: {
  ref: string | undefined;
  ctx: TestContext | RuntimeExpressionContext;
}): Workflow | undefined {
  if (!ref) {
    return undefined;
  }

  if (!ref.startsWith('$')) {
    return 'workflows' in ctx
      ? ctx.workflows?.find((workflow) => workflow.workflowId === ref)
      : undefined;
  }

  const parsedRef = parseSourceDescriptionWorkflowRef(ref);

  if (!parsedRef) {
    return undefined;
  }

  const workflows = ctx.$sourceDescriptions?.[parsedRef.sourceDescriptionName]?.workflows;

  return Array.isArray(workflows)
    ? workflows.find((workflow: Workflow) => workflow.workflowId === parsedRef.workflowId)
    : undefined;
}
