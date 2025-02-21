// import type { RuleSeverity } from '@redocly/openapi-core/lib/config/types';
import type { CalculatedResults, Step, WorkflowExecutionResult } from '../../types';

export function calculateTotals(workflows: WorkflowExecutionResult[]): CalculatedResults {
  debugger;
  const totalWorkflows = workflows.length;
  let failedChecks = 0;
  let totalChecks = 0;
  let totalSteps = 0;
  let totalWarnings = 0;
  let totalSkipped = 0;
  const failedWorkflows = new Set();
  const workflowsWithSkippedStepsChecks = new Set();
  const workflowsWithWarningsStepsChecks = new Set();
  const failedSteps = new Set();
  const skippedSteps = new Set();
  const warningsSteps = new Set();


  for (const workflow of workflows) {
    const steps = flattenNestedSteps(workflow.executedSteps);
    for (const step of steps) {
      totalSteps++;
      for (const check of step.checks) {
        totalChecks++;
        if (!check.pass) {
          switch (check.severity) {
            case 'warn':
              totalWarnings++;
              workflowsWithWarningsStepsChecks.add(workflow.workflowId);
              warningsSteps.add(workflow.workflowId + ':' + step.stepId);
              break;
            case 'off':
              totalSkipped++;
              workflowsWithSkippedStepsChecks.add(workflow.workflowId);
              skippedSteps.add(workflow.workflowId + ':' + step.stepId);
              break;
            default:
              failedChecks++;
              failedWorkflows.add(workflow.workflowId);
              failedSteps.add(workflow.workflowId + ':' + step.stepId);
          }
        }
      }
    }
  }

  return {
    workflows: {
      passed: totalWorkflows - failedWorkflows.size,
      failed: failedWorkflows.size,
      warnings: workflowsWithWarningsStepsChecks.size,
      skipped: workflowsWithSkippedStepsChecks.size,
      total: totalWorkflows,
    },
    steps: {
      passed: totalSteps - failedSteps.size,
      failed: failedSteps.size,
      warnings: warningsSteps.size,
      skipped: skippedSteps.size,
      total: totalSteps,
    },
    checks: {
      passed: totalChecks - failedChecks,
      failed: failedChecks,
      warnings: totalWarnings,
      skipped: totalSkipped,
      total: totalChecks,
    },
  };
}

function flattenNestedSteps(steps: (Step | WorkflowExecutionResult)[]): Step[] {
  return steps.flatMap((step) => {
    if ('executedSteps' in step) {
      return flattenNestedSteps((step as WorkflowExecutionResult).executedSteps);
    }
    return [step];
  });
}
