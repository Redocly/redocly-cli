import yaml from 'js-yaml';
import fs from 'fs';

import loadRuleset from './loader';
import getConfig from './config';
import OpenAPIRoot from './validators';

import traverseNode from './traverse';

function createContext(node, sourceFile, filePath, config) {
  return {
    document: node,
    filePath,
    path: [],
    visited: [],
    result: [],
    pathStack: [],
    source: sourceFile,
    enableCodeframe: config && config.enableCodeframe ? config.enableCodeframe : false,
    customRules: config && config.enbaleCustomRuleset ? loadRuleset(config) : [],
    config,
  };
}

export const validate = (yamlData, filePath, options) => {
  let document;
  try {
    document = yaml.safeLoad(yamlData);
  } catch (ex) {
    throw new Error("Can't load yaml file");
  }
  if (!document.openapi) return [];

  if (!options) options = {};

  const config = getConfig(options);
  const ctx = createContext(document, yamlData, filePath, config);

  // console.log(config);

  traverseNode(document, OpenAPIRoot, ctx);

  return ctx.result;
};

export const validateFromFile = (fName, options) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const doc = fs.readFileSync(resolvedFileName, 'utf-8');
  const validationResult = validate(doc, resolvedFileName, options);
  return validationResult;
};
