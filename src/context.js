import path from 'path';

import loadRuleset from './loader';

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

export default createContext;
