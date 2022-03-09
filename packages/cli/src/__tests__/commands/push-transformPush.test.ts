import { transformPush } from '../../commands/push';

jest.mock('fs', () => ({ existsSync: (fileName: string) => fileName === 'openapi.yaml' }));

describe('transformPush', () => {
  it('should adapt the existing syntax', () => {
    const cb = jest.fn();
    transformPush(cb)({
      maybeEntrypointOrDestination: 'openapi.yaml',
      maybeDestination: '@testing_org/main@v1',
    });
    expect(cb).toBeCalledWith({
      entrypoint: 'openapi.yaml',
      destination: '@testing_org/main@v1',
    });
  });
  it('should adapt the existing syntax (including branchName)', () => {
    const cb = jest.fn();
    transformPush(cb)({
      maybeEntrypointOrDestination: 'openapi.yaml',
      maybeDestination: '@testing_org/main@v1',
      maybeBranchName: 'other',
    });
    expect(cb).toBeCalledWith({
      entrypoint: 'openapi.yaml',
      destination: '@testing_org/main@v1',
      branchName: 'other',
    });
  });
  it('should use --branch option firstly', () => {
    const cb = jest.fn();
    transformPush(cb)({
      maybeEntrypointOrDestination: 'openapi.yaml',
      maybeDestination: '@testing_org/main@v1',
      maybeBranchName: 'other',
      branch: 'priority-branch',
    });
    expect(cb).toBeCalledWith({
      entrypoint: 'openapi.yaml',
      destination: '@testing_org/main@v1',
      branchName: 'priority-branch',
    });
  });
  it('should work for a destination only', () => {
    const cb = jest.fn();
    transformPush(cb)({
      maybeEntrypointOrDestination: '@testing_org/main@v1',
    });
    expect(cb).toBeCalledWith({
      destination: '@testing_org/main@v1',
    });
  });
  it('should ignore a wrong entrypoint', () => {
    const cb = jest.fn();
    transformPush(cb)({
      maybeEntrypointOrDestination: 'wrong-entrypoing',
      maybeDestination: '@testing_org/main@v1',
    });
    expect(cb).toBeCalledWith({
      destination: '@testing_org/main@v1',
    });
  });
  it('should accept no arguments at all', () => {
    const cb = jest.fn();
    transformPush(cb)({});
    expect(cb).toBeCalledWith({});
  });
});
