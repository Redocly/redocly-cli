/* eslint-disable no-param-reassign */
import fs from 'fs';
import yaml from 'js-yaml';

import { OpenAPIRoot } from './types/OAS3';
import { OAS2Root } from './types/OAS2';

import { createYAMLParseError } from './error';

import { getFile } from './utils';

import { getLintConfig } from './config';
import traverseNode from './traverse';
import createContext from './context';

export const validate = async (yamlData, filePath, options = {}) => {
  let document;
  try {
    document = yaml.safeLoad(yamlData);
  } catch (ex) {
    return [createYAMLParseError(ex, {}, filePath, yamlData, true)];
  }
  if (!document.openapi && !document.swagger && !document.$ref) return [];

  const config = getLintConfig(options);
  config.rules.bundler = 'off';

  const ctx = createContext(document, yamlData, filePath, config);

  ctx.getRule = ctx.getRule.bind(null, ctx);

  const rootNode = ctx.openapiVersion === 3 ? OpenAPIRoot : OAS2Root;
  await traverseNode(document, rootNode, ctx);

  const filtered = ctx.result.filter((msg) => {
    for (let j = 0; j < ctx.customRules.length; j++) {
      if (msg.fromRule === ctx.customRules[j]) {
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

export const validateFromUrl = async (link, options) => {
  const doc = await getFile(link);
  const validationResult = await validate(doc, link, options);
  return validationResult;
};

export const validateFromFile = async (fName, options) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const doc = fs.readFileSync(resolvedFileName, 'utf-8');
  const validationResult = await validate(doc, resolvedFileName, options);
  return validationResult;
};
