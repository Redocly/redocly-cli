import fs from 'fs';
import yaml from 'js-yaml';

import { getLintConfig, getRegistryConfig } from './config';
import traverseNode from './traverse';
import createContext from './context';

import RedoclyClient from './redocly';

import { OpenAPIRoot } from './types';

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

  const registryConfig = getRegistryConfig({});
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


  const lintConfig = getLintConfig({}, { lint: derivedLintConfig });
  lintConfig.rules = {
    ...lintConfig.rules,
    bundler: {
      ...(lintConfig.rules && typeof lintConfig.rules.bundler === 'object' ? lintConfig.rules.bundler : null),
      output: outputFile,
      ignoreErrors: force,
    },
  };

  const ctx = createContext(document, doc, resolvedFileName, lintConfig, redoclyClient);

  traverseNode(document, OpenAPIRoot, ctx);
  return ctx.result;
};

export const bundle = (fName, force, options) => {
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

  traverseNode(document, OpenAPIRoot, ctx);

  return { bundle: ctx.bundlingResult, result: ctx.result, fileDependencies: ctx.fileDependencies };
};

export default bundleToFile;
