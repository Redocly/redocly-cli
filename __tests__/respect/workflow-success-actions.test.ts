import { getParams, getCommandOutput, getFixturePath } from './utils';

it('should execute successActions for each workflow step if it does not have onSuccess action itself', () => {
  const params = getParams('../../lib-internal/cli.js', [
    'run',
    getFixturePath('workflow-success-actions.yaml'),
  ]);
  const result = getCommandOutput(params);
  expect(result).toMatchSnapshot();
});
