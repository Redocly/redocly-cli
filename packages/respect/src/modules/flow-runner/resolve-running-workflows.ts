export function resolveRunningWorkflows(
  workflows: string | string[] | undefined,
): string[] | undefined {
  if (!workflows) {
    return undefined;
  }

  if (typeof workflows === 'string') {
    return workflows.includes(',') ? workflows.split(',').map((w) => w.trim()) : [workflows];
  }

  if (Array.isArray(workflows)) {
    const result: string[] = [];
    for (const workflow of workflows) {
      if (workflow.includes(',')) {
        result.push(...workflow.split(',').map((w) => w.trim()));
      } else {
        result.push(workflow);
      }
    }
    return result;
  }

  return undefined;
}
