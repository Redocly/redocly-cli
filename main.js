/* eslint-disable no-console */
import path from 'path';
import { validateFromFile } from './src';

const test = async (fn, fNmae, name) => {
  const start = Date.now();
  const results = await fn(fNmae);
  const end = Date.now();
  console.log(results ? results.length : `good with ${name}`);
  results.forEach((res) => {
    console.log(res.prettyPrint());
  });
  console.log(`Evaluation took: ${end - start} ms with ${name}`);
};

console.log(path.resolve(''));
test(validateFromFile, 'test/specs/openapi/rebilly-full.yaml', 'revalid');
