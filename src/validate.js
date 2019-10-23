import fs from 'fs';
import yaml from 'js-yaml';

import OpenAPIRoot from './types';

import getConfig from './config';
import traverseNode from './traverse';
import createContext from './context';

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
  const ctx = createContext(document, yamlData, filePath, config);

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
