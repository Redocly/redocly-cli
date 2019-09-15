// import fs from 'gs';
// import { validateFromFile, validate } from './src';
// import yaml from 'yaml';

// const doc = fs.readFileSync('./test/specs/openapi/valid-2.yaml', 'utf-8');

// for (let i = 0; i < 10000; i++) {
//     validate(doc);
// }

import { validateFromFile } from './src';

console.log(validateFromFile('./test/specs/openapi/valid-2.yaml'));