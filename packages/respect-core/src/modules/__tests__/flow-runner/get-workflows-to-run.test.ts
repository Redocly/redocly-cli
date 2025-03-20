import { getWorkflowsToRun } from '../../flow-runner';
import { DefaultLogger } from '../../../utils/logger/logger';

const logger = DefaultLogger.getInstance();

describe('getWorkflowsToRun', () => {
  const workflows = [
    {
      workflowId: 'flow1',
      steps: [],
    },
    {
      workflowId: 'flow2',
      steps: [],
    },
  ];
  it('should return all workflows if no workflowToRun and no workflowsToSkip are provided', () => {
    const workflowToRun = undefined;
    const workflowsToSkip = undefined;
    const result = getWorkflowsToRun(workflows, workflowToRun, workflowsToSkip);

    expect(result).toEqual(workflows);
  });

  it('should return all workflows if workflowIds are empty', () => {
    const workflowIds = [] as string[];
    const result = getWorkflowsToRun(workflows, workflowIds, undefined);

    expect(result).toEqual(workflows);
  });

  it('should return all workflows if workflowIds are not found', () => {
    const workflowIds = ['flow3'];

    try {
      getWorkflowsToRun(workflows, workflowIds, undefined);
    } catch (error) {
      expect(error.message).toEqual(`Following workflows don't exist: ${workflowIds.join(', ')}`);
    }
  });

  it('should return only the workflows that match the workflowIds', () => {
    const workflowIds = ['flow1'];
    const result = getWorkflowsToRun(workflows, workflowIds, undefined);

    expect(result).toEqual([workflows[0]]);
  });

  it('should return only the workflows that match the workflowIds and ignore the one does not exist', () => {
    const mockLogger = vi.spyOn(logger, 'log').mockImplementation(() => {});
    const workflowIds = ['flow1', 'flow2', 'flow3'];
    const result = getWorkflowsToRun(workflows, workflowIds, undefined);

    expect(result).toEqual(workflows);

    expect(mockLogger).toHaveBeenCalledWith("Following workflows don't exist: flow3");

    mockLogger.mockRestore();
  });

  it('should return not skipped workflows when skip option is provided', () => {
    const mockLogger = vi.spyOn(logger, 'log').mockImplementation(() => {});

    const workflowToRun = undefined;
    const workflowsToSkip = ['flow1'];
    const result = getWorkflowsToRun(workflows, workflowToRun, workflowsToSkip);

    expect(mockLogger).toHaveBeenCalledTimes(1);
    expect(mockLogger).toHaveBeenCalledWith(
      expect.stringMatching('Following workflows are skipped: flow1')
    );
    expect(result).toEqual([
      {
        workflowId: 'flow2',
        steps: [],
      },
    ]);

    mockLogger.mockRestore();
  });

  it('should return empty workflows list and write warning when all workflows are skipped', () => {
    const mockLogger = vi.spyOn(logger, 'log').mockImplementation(() => {});

    const workflowToRun = undefined;
    const workflowsToSkip = ['flow1', 'flow2'];
    const result = getWorkflowsToRun(workflows, workflowToRun, workflowsToSkip);

    expect(mockLogger).toHaveBeenCalledTimes(1);
    expect(mockLogger).toHaveBeenCalledWith(expect.stringMatching('All workflows are skipped'));
    expect(result).toEqual([]);

    mockLogger.mockRestore();
  });
});
