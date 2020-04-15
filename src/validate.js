/* eslint-disable no-param-reassign */
import yaml from 'js-yaml';

import { OpenAPIRoot } from './types/OAS3';
import { OAS2Root } from './types/OAS2';

import { createYAMLParseError } from './error';

import { getFile, readYaml } from './utils';

import { getLintConfig } from './config';
import traverseNode from './traverse';
import createContext from './context';

export const validate = async (document, yamlSource, filePath, options = {}) => {
  if (!document.openapi && !document.swagger && !document.$ref) return [];

  const config = getLintConfig(options);
  config.rules.bundler = 'off';

  const ctx = createContext(document, yamlSource, filePath, config);

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
  const source = await getFile(link);
  let document;
  try {
    document = yaml.safeLoad(source);
  } catch (ex) {
    return [createYAMLParseError(ex, {}, link, source, true)];
  }
  const validationResult = await validate(document, source, link, options);
  return validationResult;
};

export const validateFromFile = async (fName, options) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const { document, source } = readYaml(resolvedFileName);
  const validationResult = await validate(document, source, resolvedFileName, options);
  return validationResult;
};
