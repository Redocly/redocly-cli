import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

import loadRuleset from './loader';
import getConfig from './config';
import OpenAPIRoot from './types';

import traverseNode from './traverse';

function createContext(node, sourceFile, filePath, config) {
  return {
    document: node,
    filePath: path.resolve(filePath),
    path: [],
    cache: {},
    visited: [],
    result: [],
    definitionStack: [],
    pathStack: [],
    source: sourceFile,
    enableCodeframe: config && config.enableCodeframe ? config.enableCodeframe : false,
    customRules: config && config.enbaleCustomRuleset ? loadRuleset(config) : [],
    config,
  };
}

export const validate = (yamlData, filePath, options = {}) => {
  let document;
  try {
    document = yaml.safeLoad(yamlData);
  } catch (ex) {
    throw new Error("Can't load yaml file");
  }
  if (!document.openapi) return [];

  const config = getConfig(options);
  const ctx = createContext(document, yamlData, filePath, config);

  // ctx.result.push(ctx);
  // console.log(config);

  traverseNode(document, OpenAPIRoot, ctx);
  // console.log(ctx.cache);
  return ctx.result;
};

export const validateFromFile = (fName, options) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const doc = fs.readFileSync(resolvedFileName, 'utf-8');
  const validationResult = validate(doc, resolvedFileName, options);
  return validationResult;
};
