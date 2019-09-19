/* eslint-disable no-console */
import fs from 'fs';
import { validate, validateFromFile } from './src';

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


test(validateFromFile, './test/specs/openapi/valid-1.yaml', 'revalid');

// const data = validate(fs.readFileSync('./test/specs/openapi/valid-1.yaml', 'utf-8'));
// data.forEach((d) => {
//   console.log(d.prettyPrint());
// });
