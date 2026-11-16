import type { Check, Step, WorkflowExecutionResult } from '../../../types.js';
import { calculateTotals } from '../calculate-tests-passed.js';

describe('calculateTotals', () => {
  it('should count a step that calls a workflow as a step but not as a request', () => {
    const passedCheck = {
      name: 'SUCCESS_CRITERIA_CHECK',
      passed: true,
      severity: 'error',
    } as unknown as Check;

    const childWorkflow = {
      type: 'workflow',
      workflowId: 'get-menu-page-limit',
      stepId: 'expect-default-page-limit',
      executedSteps: [
        { stepId: 'list-menu-items', operationId: 'listMenuItems', checks: [passedCheck] },
      ],
    } as unknown as WorkflowExecutionResult;
    const workflowStep = {
      stepId: 'expect-default-page-limit',
      workflowId: 'get-menu-page-limit',
      checks: [passedCheck],
    } as unknown as Step;

    const totals = calculateTotals([
      {
        type: 'workflow',
        workflowId: 'check-menu-page-limit',
        executedSteps: [childWorkflow, workflowStep],
      } as unknown as WorkflowExecutionResult,
    ]);

    expect(totals.totalRequests).toEqual(1);
    expect(totals.steps).toMatchObject({ passed: 2, failed: 0, total: 2 });
    expect(totals.checks).toMatchObject({ passed: 2, failed: 0, total: 2 });
  });
});
