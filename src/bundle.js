import fs from 'fs';
import yaml from 'js-yaml';

import { getLintConfig } from './config';
import traverseNode from './traverse';
import createContext from './context';

import RedoclyClient from './redocly';

import { OpenAPIRoot } from './types';

export const bundleToFile = async (fName, outputFile, force) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const doc = fs.readFileSync(resolvedFileName, 'utf-8');
  let document;

  try {
    document = yaml.safeLoad(doc);
  } catch (ex) {
    throw new Error("Can't load yaml file");
  }

  if (!document.openapi) { return []; }

  const lintConfig = getLintConfig({});
  lintConfig.rules = {
    ...lintConfig.rules,
    bundler: {
      ...(lintConfig.rules && typeof lintConfig.rules.bundler === 'object' ? lintConfig.rules.bundler : null),
      output: outputFile,
      ignoreErrors: force,
    },
  };

  const redoclyClient = new RedoclyClient();
  const ctx = createContext(document, doc, resolvedFileName, lintConfig, redoclyClient);

  await traverseNode(document, OpenAPIRoot, ctx);
  return ctx.result;
};

export const bundle = async (fName, force, options) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const doc = fs.readFileSync(resolvedFileName, 'utf-8');
  let document;

  try {
    document = yaml.safeLoad(doc);
  } catch (ex) {
    throw new Error("Can't load yaml file");
  }

  if (!document.openapi) { return []; }

  const config = getLintConfig(options);
  config.rules = {
    ...config.rules,
    bundler: {
      ...(config.rules && typeof config.rules.bundler === 'object' ? config.rules.bundler : null),
      outputObject: true,
      ignoreErrors: force,
    },
  };

  const ctx = createContext(document, doc, resolvedFileName, config);

  await traverseNode(document, OpenAPIRoot, ctx);

  return { bundle: ctx.bundlingResult, result: ctx.result, fileDependencies: ctx.fileDependencies };
};

export default bundleToFile;
