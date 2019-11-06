import fs from 'fs';
import yaml from 'js-yaml';


import traverseNode from './traverse';
import createContext from './context';

import OpenAPIRoot from './types';

export const bundleFromFile = (fName, outputFile) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const doc = fs.readFileSync(resolvedFileName, 'utf-8');
  let document;

  try {
    document = yaml.safeLoad(doc);
  } catch (ex) {
    throw new Error("Can't load yaml file");
  }

  if (!document.openapi) { return []; }

  const config = {
    codeframes: true,
    rules: {
      bundler: {
        output: outputFile,
      },
    },
  };

  const ctx = createContext(document, doc, resolvedFileName, config);

  traverseNode(document, OpenAPIRoot, ctx);
  return ctx.result;
};

export const bundle = (fName) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const doc = fs.readFileSync(resolvedFileName, 'utf-8');
  let document;

  try {
    document = yaml.safeLoad(doc);
  } catch (ex) {
    throw new Error("Can't load yaml file");
  }

  if (!document.openapi) { return []; }

  const config = {
    codeframes: true,
    rules: {
      bundler: {
        outputObject: true,
      },
    },
  };

  const ctx = createContext(document, doc, resolvedFileName, config);

  traverseNode(document, OpenAPIRoot, ctx);

  return ctx.bundlingResult;
};

export default bundleFromFile;
