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
    enableCodeframe: !!(config && (config.codeframes === 'on' || config.codeframes === true)),
    // customRules: config && config.enbaleCustomRuleset ? loadRuleset(config) : [],
    customRules: loadRuleset(config),
    config,
  };
}

export const validate = (yamlData, filePath, options = {}) => {
  let document;
  try {
    document = yaml.safeLoad(yamlData);
  } catch (ex) {
    console.log(ex);
    throw new Error("Can't load yaml file");
  }
  if (!document.openapi) return [];

  const config = getConfig(options);
  // console.log(config);
  const ctx = createContext(document, yamlData, filePath, config);
  // ctx.result.push(ctx);

  traverseNode(document, OpenAPIRoot, ctx);

  const filtered = ctx.result.filter((msg) => {
    for (let j = 0; j < ctx.customRules.length; j++) {
      if (msg.fromRule === ctx.customRules[j].rule) {
        if (ctx.customRules[j].config.excludePaths) {
          const fullPath = `${msg.file}#/${msg.path.join('/')}`;
          return ctx.customRules[j].config.excludePaths.indexOf(fullPath) === -1;
        }
        return true;
      }
    }
    return true;
  });

  return filtered;
};

export const validateFromFile = (fName, options) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const doc = fs.readFileSync(resolvedFileName, 'utf-8');
  const validationResult = validate(doc, resolvedFileName, options);
  return validationResult;
};

export const bundle = (fName, outputFile) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const doc = fs.readFileSync(resolvedFileName, 'utf-8');
  let document;

  try {
    document = yaml.safeLoad(doc);
  } catch (ex) {
    throw new Error("Can't load yaml file");
  }

  if (!document.openapi) return [];

  const config = {
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
