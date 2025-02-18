import { getParams, getCommandOutput } from '../utils';
import { join } from 'path';

// Snapshot should have two workflows, and first workflow should run only first step
it('should end workflow execution, context returns to the caller with applicable outputs, when step passes and onSuccess action is of type `end`', () => {
  process.env.AUTH_TOKEN = 'Basic Og==';

  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'step-on-success-type-end-action.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();

  delete process.env.AUTH_TOKEN;
});
