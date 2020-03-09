/* eslint-disable no-param-reassign */
import fs from 'fs';
import yaml from 'js-yaml';

import { OpenAPIRoot } from './types';

import { createYAMLParseError } from './error';

import { getFileSync } from './utils';

import { getLintConfig, getRegistryConfig } from './config';
import traverseNode from './traverse';
import createContext from './context';

import RedoclyClient from './redocly';

export const validate = (yamlData, filePath, options = {}) => {
  let document;
  try {
    document = yaml.safeLoad(yamlData);
  } catch (ex) {
    return [createYAMLParseError(ex, {}, filePath, yamlData, true)];
  }
  if (!document.openapi && !document.$ref) return [];

  const registryConfig = getRegistryConfig(options);
  let derivedLintConfig = {};

  const redoclyClient = new RedoclyClient();
  if (registryConfig
    && registryConfig.organization
    && registryConfig.definition
    && registryConfig.definitionVersion) {
    if (redoclyClient.isLoggedIn()) {
      derivedLintConfig = redoclyClient.getLintConfig(
        registryConfig.organization,
        registryConfig.definition,
        registryConfig.definitionVersion,
      );
      derivedLintConfig = JSON.parse(derivedLintConfig);
    }
  }

  const config = getLintConfig(options, { lint: derivedLintConfig });
  config.rules.bundler = 'off';

  const ctx = createContext(document, yamlData, filePath, config, redoclyClient);

  ctx.getRule = ctx.getRule.bind(null, ctx);

  traverseNode(document, OpenAPIRoot, ctx);

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

export const validateFromUrl = (link, options) => {
  const doc = getFileSync(link);
  options.sourceUrl = true;
  const validationResult = validate(doc, link, options);
  return validationResult;
};

export const validateFromFile = (fName, options) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const doc = fs.readFileSync(resolvedFileName, 'utf-8');
  const validationResult = validate(doc, resolvedFileName, options);
  return validationResult;
};
