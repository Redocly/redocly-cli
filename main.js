/* eslint-disable no-console */
import chalk from 'chalk';
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


test(validateFromFile, './test/specs/openapi/rebilly-full (1).yaml', 'revalid');

// const a = chalk.red('blblblb');
// console.log(a);
// console.log('\u001b[4m'.length);
// console.log({ a });

// console.log('\u001b[94mbla\u001b[39m');

// const string = 'collectionExpand:\n'
// + 'name: expand\n'
// + `${chalk.blue('querya')}\n`
// + 'description: >\n'
// + '  Expand a response to get a full related object included inside';

// console.log(string);
