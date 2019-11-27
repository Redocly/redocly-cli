import path from 'path';

import loadRuleset, { loadRulesetExtension } from './loader';
import isRuleEnabled from './visitors/utils';

const validateFieldsRaw = (node, ctx, config, validators, ruleName) => {
  const result = [];

  const vals = Object.keys(validators);
  for (let i = 0; i < vals.length; i += 1) {
    if (isRuleEnabled(config, vals[i])) {
      if (validators[vals[i]]) {
        ctx.path.push(vals[i]);
        const validate = validators[vals[i]].bind({ rule: ruleName, config });
        const res = validate(node, ctx, config);
        if (res) {
          if (Array.isArray(res)) result.push(...res);
          else result.push(res);
        }
        ctx.path.pop();
      }
    }
  }
  return result;
};

const getRule = (ctx, ruleName) => {
  const result = ctx.allRules.filter((r) => r.rule === ruleName);
  return result ? result[0] : null;
};

function createContext(node, sourceFile, filePath, config) {
  const [enabledRules, allRules] = loadRuleset(config);
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
    customRules: [...enabledRules, ...loadRulesetExtension(config)],
    allRules,
    config,
    validateFieldsRaw,
    getRule,
  };
}

export default createContext;
