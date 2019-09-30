/* eslint-disable import/no-named-as-default */
/* eslint-disable no-console */
// eslint-disable-next-line import/no-named-as-default-member
import validateFromFile from './src';

const test = async (fNmae, name) => {
  const start = Date.now();
  const options = {
    enableCodeframe: true,
    enbaleCustomRuleset: true,
  };
  const results = await validateFromFile(fNmae, options);
  const end = Date.now();
  results.forEach((res) => {
    console.log(res.prettyPrint());
  });
  console.log(results ? results.length : `good with ${name}`);
  console.log(`Evaluation took: ${end - start} ms with ${name}`);
};

test('test/specs/openapi/with-file-ref.yaml', 'revalid');
