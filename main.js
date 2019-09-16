// import fs from 'gs';
// import { validateFromFile, validate } from './src';
// import yaml from 'yaml';

// const doc = fs.readFileSync('./test/specs/openapi/valid-2.yaml', 'utf-8');

// for (let i = 0; i < 10000; i++) {
//     validate(doc);
// }

import { validateFromFile } from './src';
import fs from 'fs';
const { Spectral } = require('@stoplight/spectral');
const { parseWithPointers } = require("@stoplight/yaml");
const spectral = new Spectral();

const validateWithSpectral = async (fName) => {
    const myOpenApiDocument = parseWithPointers(fs.readFileSync(fName));
    const results = await spectral.run(myOpenApiDocument); 
    let fRes = results.filter(r => r.code !== 'invalid-ref');
    return fRes;
};

const test = async (fn, fNmae, name) => {
    const start = Date.now();
    const results = await fn(fNmae);
    const end = Date.now();
    console.log(results ? results.length : `good with ${name}`);
    console.log(results);
    console.log(`Evaluation took: ${end - start} ms with ${name}`);
};

// test(validateWithSpectral, './test/specs/openapi/rebilly-full (1).yaml', 'spectral');
test(validateFromFile, './test/specs/openapi/rebilly-full (1).yaml', 'revalid');
// const start1 = Date.now();
// console.log(validateWithSpectral('./test/specs/openapi/valid-3.yaml'));
// const end1 = Date.now();
// console.log(`Evaluation took: ${end1 - start1} ms with Spectral`);

// const start = Date.now();
// console.log(validateFromFile('./test/specs/openapi/valid-3.yaml'));
// const end = Date.now();
// console.log(`Evaluation took: ${end - start} ms with Revalid`);

