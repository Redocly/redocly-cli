import type { Workflow } from '../../../../types';

import { getStepFromCtx } from '../../../flow-runner';

describe('getStepFromCtx', () => {
  it('should throw an error if workflow is not found', () => {
    const ctx = {
      workflows: [],
    } as any;

    expect(() => getStepFromCtx(ctx, 'workflowId', 'stepId')).toThrowError(
      'Workflow "workflowId" not found in context',
    );
  });

  it('should throw an error if step is not found', () => {
    const ctx = {
      workflows: [
        {
          workflowId: 'workflowId',
          steps: [],
        },
      ],
    } as any;

    expect(() => getStepFromCtx(ctx, 'workflowId', 'stepId')).toThrowError(
      'Step "stepId" not found in workflow "workflowId"',
    );
  });

  it('should return a step', () => {
    const ctx = {
      workflows: [
        {
          workflowId: 'workflowId',
          steps: [
            {
              stepId: 'stepId',
              checks: [],
            },
          ],
        },
      ],
    } as any;

    expect(getStepFromCtx(ctx, 'workflowId', 'stepId')).toEqual({
      stepId: 'stepId',
      checks: [],
    });
  });

  it('should return a step when workflow passed as an argument', () => {
    const ctx = {
      workflows: [
        {
          workflowId: 'workflowId',
          steps: [
            {
              stepId: 'stepId',
              checks: [],
            },
          ],
        },
      ],
    } as any;
    const workflow = {
      workflowId: 'workflowId',
      steps: [
        {
          stepId: 'stepId',
          checks: [],
        },
      ],
    } as unknown as Workflow;

    expect(getStepFromCtx(ctx, workflow, 'stepId')).toEqual({
      stepId: 'stepId',
      checks: [],
    });
  });
});
