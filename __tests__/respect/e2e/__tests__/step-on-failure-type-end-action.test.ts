import { getParams, getCommandOutput, getFixturePath } from './utils';

// Snapshot should have two workflows, and first workflow should run only first step
it('should end workflow execution, context returns to the caller with applicable outputs, when step fails and onFailure action is of type `end`', () => {
  process.env.AUTH_TOKEN = 'Basic Og==';

  const params = getParams('../../lib-internal/cli.js', [
    'run',
    getFixturePath('step-on-failure-type-end-action.yaml'),
  ]);

  const result = getCommandOutput(params);

  expect(result).toMatchSnapshot();
  delete process.env.AUTH_TOKEN;
});
