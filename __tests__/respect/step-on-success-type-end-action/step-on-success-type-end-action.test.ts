import { getParams, getCommandOutput } from '../utils';
import { join } from 'path';

// Snapshot should have two workflows, and first workflow should run only first step
test('should end workflow execution, context returns to the caller with applicable outputs, when step passes and onSuccess action is of type `end`', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'step-on-success-type-end-action.arazzo.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
});
