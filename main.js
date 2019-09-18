/* eslint-disable no-console */
import { validateFromFile } from './src';

const test = async (fn, fNmae, name) => {
  const start = Date.now();
  const results = await fn(fNmae);
  const end = Date.now();
  console.log(results ? results.length : `good with ${name}`);
  results.forEach((res) => {
    console.log(res);
    console.log(res.codeFrame);
  });
  console.log(`Evaluation took: ${end - start} ms with ${name}`);
};

test(validateFromFile, './test/specs/openapi/rebilly-full (1).yaml', 'revalid');
