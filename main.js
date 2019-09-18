/* eslint-disable no-console */
// import fs from 'gs';
// import { validateFromFile, validate } from './src';
// import yaml from 'yaml';

// const doc = fs.readFileSync('./test/specs/openapi/valid-2.yaml', 'utf-8');

// for (let i = 0; i < 10000; i++) {
//     validate(doc);
// }

import fs from 'fs';
import { parse } from 'yaml-unist-parser';
import { safeLoad, Kind } from 'yaml-ast-parser';
import { validateFromFile } from './src';

//  const validateWithSpectral = async (fName) => {
//  const myOpenApiDocument = parseWithPointers(fs.readFileSync(fName));
//  const results = await spectral.run(myOpenApiDocument);
//  const fRes = results.filter((r) => r.code !== 'invalid-ref');
//  return fRes;
//  };

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


// const getDocumentStart = (doc) => doc.children[0].children[1].children[0];


// const yamlString = fs.readFileSync('./test/specs/openapi/rebilly-full (1).yaml', 'utf-8');
// const t1 = Date.now();
// const ast = safeLoad(yamlString);
// // const ast = parse(yamlString);
// const t2 = Date.now();
// console.log(`Parsed AST during ${t2 - t1} ms`);
// console.log();

// const path = ['components', 'schemas', 'Integration', 'properties', 'configurations', 'items', 'properties', 'eventType', 'allOf', 0].reverse();

// //   '0': 'SCALAR',
// //   '1': 'MAPPING',
// //   '2': 'MAP',
// //   '3': 'SEQ',
// //   '4': 'ANCHOR_REF',
// //   '5': 'INCLUDE_REF',
// const t3 = Date.now();
// const tags = getNodeByPath(ast, path);
// const t4 = Date.now();
// console.log(tags.mappings[0]);
// console.log(`Found node by ${t4 - t3} ms`);
