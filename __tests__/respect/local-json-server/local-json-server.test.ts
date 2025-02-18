// import { getParams, getCommandOutput } from '../utils';
// import { join } from 'path';

// test('local-json-server test case', () => {
//   const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
//   const fixturesPath = join(__dirname, 'local-json-server.yaml');
//   const args = getParams(indexEntryPoint, ['respect', fixturesPath]);

//   const result = getCommandOutput(args);
//   expect(result).toMatchSnapshot();
// });


test('local-json-server test case', () => {
  //TODO: Remove.Disable this test until json-server is added to the e2e flow.
  expect(true).toBe(true);
});
