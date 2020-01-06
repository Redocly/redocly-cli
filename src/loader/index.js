/* eslint-disable no-underscore-dangle */
import path from 'path';
import fs from 'fs';

const get = (p, o) => p.reduce((xs, x) => ((xs && xs[x]) ? xs[x] : null), o);

function getObjByPathOrParent(json, JSONPath) {
  const value = get(JSONPath.split('.'), json);
  switch (typeof value) {
    case 'string':
      return {
        level: value,
      };
    case 'object':
    default:
      return {
        level: 4,
        ...value,
      };
  }
}

function loadRuleset(config) {
  const ruleSet = [];
  const allRules = [];

  const configCopy = {
    ...config,
    rulesPath: config.rulesPath ? config.rulesPath : `${__dirname}/../visitors`,
  };
  let rulesDirectory = path.resolve(configCopy.rulesPath);
  if (!fs.existsSync(rulesDirectory)) {
    rulesDirectory = `${__dirname}/../visitors`;
  }
  const ruleSetDirContents = fs.readdirSync(rulesDirectory)
    .map((fName) => `${rulesDirectory}/${fName}`);
  const files = ruleSetDirContents.filter((fName) => fs.lstatSync(fName).isFile());

  const dirs = ruleSetDirContents
    .filter((fName) => !fs.lstatSync(fName).isFile() && fName.indexOf('utils') === -1);

  files.forEach((file) => {
    const Rule = require(file);
    const ruleConfig = getObjByPathOrParent(configCopy.rules, Rule.rule) || { level: 4 };

    const ruleInstance = new Rule(ruleConfig);
    if (ruleConfig.level !== 'off') {
      if (!ruleInstance.config) {
        ruleInstance.config = ruleConfig;
      }
      ruleInstance._config = ruleConfig;
      ruleSet.push(ruleInstance);
    }
    allRules.push(ruleInstance);
  });

  dirs.forEach((dir) => {
    const [nestedRules, allNestedRules] = loadRuleset({
      ...configCopy,
      rulesPath: dir,
    });
    ruleSet.push(...nestedRules);
    allRules.push(...allNestedRules);
  });

  return [ruleSet, allRules];
}

export function loadRulesetExtension(config, rulesetName) {
  const additionalRules = [];

  const configCopy = {
    ...config,
    rulesPath: config.rulesPath ? config.rulesPath : `${__dirname}/../visitors`,
  };

  config[rulesetName].forEach((Rule) => {
    const ruleConfig = getObjByPathOrParent(configCopy.rules, Rule.rule) || { level: 4 };

    if (ruleConfig.level !== 'off') {
      const ruleInstance = new Rule(ruleConfig);
      if (!ruleInstance.config) {
        ruleInstance.config = ruleConfig;
      }
      ruleInstance._config = ruleConfig;
      additionalRules.push(ruleInstance);
    }
  });
  return additionalRules;
}

export default loadRuleset;
