import { maskSecrets } from './mask-secrets';

import type { TestContext, JsonLogs } from '../../types';

export function composeJsonLogs(ctx: TestContext): JsonLogs {
  const { secretFields } = ctx;
  const jsonLogs = { ...ctx.$workflows } as JsonLogs;

  for (const workflow of ctx.workflows) {
    const workflowId = workflow.workflowId;
    jsonLogs[workflowId].time = workflow.time;

    for (const step of workflow.steps) {
      const stepId = step.stepId;

      if (jsonLogs[workflowId] && jsonLogs[workflowId].steps[stepId]) {
        jsonLogs[workflowId].steps[stepId].checks = step.checks;

        if (step.verboseLog) {
          const { host, path } = step.verboseLog;
          // Log resolved url
          if (jsonLogs[workflowId].steps[stepId]?.request) {
            jsonLogs[workflowId].steps[stepId].request.url = `${host}${path}`;
          }
        }
      }
    }
  }

  return maskSecrets(jsonLogs, secretFields || new Set());
}
