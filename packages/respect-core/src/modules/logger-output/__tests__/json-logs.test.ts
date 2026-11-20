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

  it('should include the workflow inputs and outputs and the step outputs, with secrets masked', () => {
    const step = {
      stepId: 'login',
      operationId: 'login',
      outputs: { token: '$response.body#/token' },
      outputValues: { token: 'secret-token' },
      checks: [],
    } as unknown as Step;
    const stepWithoutOutputs = {
      stepId: 'ping',
      operationId: 'ping',
      checks: [],
    } as unknown as Step;

    const ctx = {
      $workflows: {
        'login-workflow': {
          steps: {
            // a later run of the same workflow replaced the shared step outputs
            login: { outputs: { token: 'later-run-token' } },
            ping: { outputs: {} },
          },
        },
      },
      noSecretsMasking: false,
      secretsSet: new Set<string>(['secret-token', 'secret-password']),
    } as unknown as TestContext;

    const executedWorkflow = {
      type: 'workflow',
      workflowId: 'login-workflow',
      startTime: 0,
      endTime: 1,
      totalTimeMs: 1,
      executedSteps: [step, stepWithoutOutputs],
      ctx,
      globalTimeoutError: false,
      inputs: { username: 'ada', password: 'secret-password' },
      outputs: { token: 'secret-token' },
    } as unknown as WorkflowExecutionResult;

    const { files } = composeJsonLogs(
      [
        {
          hasProblems: false,
          hasWarnings: false,
          file: 'test.arazzo.yaml',
          totalRequests: 2,
          totalTimeMs: 1,
          executedWorkflows: [executedWorkflow],
          ctx,
          globalTimeoutError: false,
        },
      ],
      1
    );

    const workflowJson = files['test.arazzo.yaml'].executedWorkflows[0];
    expect(workflowJson.inputs).toEqual({ username: 'ada', password: '********' });
    expect(workflowJson.outputs).toEqual({ token: '********' });
    expect(workflowJson.executedSteps[0]).toMatchObject({
      stepId: 'login',
      outputs: { token: '********' },
    });
    expect(workflowJson.executedSteps[1]).not.toHaveProperty('outputs');
  });
});
