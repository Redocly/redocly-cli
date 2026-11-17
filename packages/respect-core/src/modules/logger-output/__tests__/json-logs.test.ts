import type { Step, TestContext, WorkflowExecutionResult } from '../../../types.js';
import { composeJsonLogs } from '../json-logs.js';

describe('composeJsonLogs', () => {
  it('should serialize a synthetic step that has no declared counterpart in the workflow', () => {
    // a failed dependsOn resolution produces a step that exists only in the
    // execution results, not in the workflow definition
    const syntheticStep = {
      stepId: 'dependsOn',
      checks: [
        {
          name: 'UNEXPECTED_ERROR',
          message: 'Workflow some-workflow is not found.',
          passed: false,
          severity: 'error',
        },
      ],
    } as unknown as Step;

    const ctx = {
      $workflows: {
        'broken-workflow': { steps: {} },
      },
      noSecretsMasking: true,
      secretsSet: new Set<string>(),
    } as unknown as TestContext;

    const executedWorkflow = {
      type: 'workflow',
      workflowId: 'broken-workflow',
      startTime: 0,
      endTime: 1,
      totalTimeMs: 1,
      executedSteps: [syntheticStep],
      ctx,
      globalTimeoutError: false,
    } as unknown as WorkflowExecutionResult;

    const { files, status } = composeJsonLogs(
      [
        {
          hasProblems: true,
          hasWarnings: false,
          file: 'test.arazzo.yaml',
          totalRequests: 0,
          totalTimeMs: 1,
          executedWorkflows: [executedWorkflow],
          ctx,
          globalTimeoutError: false,
        },
      ],
      1
    );

    expect(status).toEqual('error');
    const workflowJson = files['test.arazzo.yaml'].executedWorkflows[0];
    expect(workflowJson.status).toEqual('error');
    expect(workflowJson.executedSteps[0]).toMatchObject({
      type: 'step',
      stepId: 'dependsOn',
      status: 'error',
    });
  });
});
