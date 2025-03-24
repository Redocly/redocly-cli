import { resolveRunningWorkflows } from '../../flow-runner/index.js';

describe('resolveRunningWorkflows', () => {
  it('should return undefined if no workflows are provided', () => {
    expect(resolveRunningWorkflows(undefined)).toBeUndefined();
  });

  it('should return an array of workflows if a single workflow is provided', () => {
    expect(resolveRunningWorkflows('workflow1')).toEqual(['workflow1']);
  });

  it('should return an array of workflows if multiple workflows are provided', () => {
    expect(resolveRunningWorkflows(['workflow1', 'workflow2'])).toEqual(['workflow1', 'workflow2']);
  });

  it('should return an array of workflows if multiple workflows are provided with commas', () => {
    expect(resolveRunningWorkflows('workflow1,workflow2')).toEqual(['workflow1', 'workflow2']);
  });

  it('should return an array of workflows if multiple workflows are provided with commas in array', () => {
    expect(resolveRunningWorkflows(['workflow1,workflow2', 'workflow3'])).toEqual([
      'workflow1',
      'workflow2',
      'workflow3',
    ]);
  });

  it('should trim whitespace from workflow names when splitting by commas', () => {
    expect(resolveRunningWorkflows('workflow1, workflow2 , workflow3')).toEqual([
      'workflow1',
      'workflow2',
      'workflow3',
    ]);
  });

  it('should return an array of workflows if multiple workflows are provided with commas in array and some workflows are skipped', () => {
    expect(resolveRunningWorkflows(['workflow1,workflow2', 'workflow3'])).toEqual([
      'workflow1',
      'workflow2',
      'workflow3',
    ]);
  });

  it('should return undefined if workflows is not a string or array', () => {
    expect(resolveRunningWorkflows(1 as any)).toBeUndefined();
  });
});
