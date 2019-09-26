/* eslint-disable import/no-named-as-default */
/* eslint-disable no-console */
// eslint-disable-next-line import/no-named-as-default-member
import validateFromFile from './src';

const test = async (fNmae, name) => {
  const start = Date.now();
  const results = await validateFromFile(fNmae, { enableCodeframe: true });
  const end = Date.now();
  console.log(results ? results.length : `good with ${name}`);
  results.forEach((res) => {
    console.log(res.prettyPrint());
  });
  console.log(`Evaluation took: ${end - start} ms with ${name}`);
};

test('test/specs/openapi/test-2.yaml', 'revalid');
