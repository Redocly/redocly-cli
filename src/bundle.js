import fs from 'fs';
import yaml from 'js-yaml';


import getConfig from './config';
import traverseNode from './traverse';
import createContext from './context';

import OpenAPIRoot from './types';

export const bundleToFile = (fName, outputFile, force) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const doc = fs.readFileSync(resolvedFileName, 'utf-8');
  let document;

  try {
    document = yaml.safeLoad(doc);
  } catch (ex) {
    throw new Error("Can't load yaml file");
  }

  if (!document.openapi) { return []; }

  const config = getConfig({});
  // config.customRules = [];
  config.rules = {
    ...config.rules,
    bundler: {
      ...(config.rules && typeof config.rules.bundler === 'object' ? config.rules.bundler : null),
      output: outputFile,
      ignoreErrors: force,
    },
  };

  const ctx = createContext(document, doc, resolvedFileName, config);

  traverseNode(document, OpenAPIRoot, ctx);
  return ctx.result;
};

export const bundle = (fName, force) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const doc = fs.readFileSync(resolvedFileName, 'utf-8');
  let document;

  try {
    document = yaml.safeLoad(doc);
  } catch (ex) {
    throw new Error("Can't load yaml file");
  }

  if (!document.openapi) { return []; }

  const config = getConfig({});
  config.rules = {
    ...config.rules,
    bundler: {
      ...(config.rules && typeof config.rules.bundler === 'object' ? config.rules.bundler : null),
      outputObject: true,
      ignoreErrors: force,
    },
  };

  const ctx = createContext(document, doc, resolvedFileName, config);

  traverseNode(document, OpenAPIRoot, ctx);

  return ctx.bundlingResult;
};

export default bundleToFile;
