import path from 'path';
import fs from 'fs';

function loadRuleset(config) {
  const ruleSet = [];
  config.rulesPath = config.rulesPath ? config.rulesPath : `${__dirname}/../extendedRules`;
  let rulesDirectory = path.resolve(config.rulesPath);
  if (!fs.existsSync(rulesDirectory)) {
    rulesDirectory = `${__dirname}/../extendedRules`;
  }
  const ruleSetDirContents = fs.readdirSync(rulesDirectory)
    .map((fName) => `${rulesDirectory}/${fName}`);
  const files = ruleSetDirContents.filter((fName) => fs.lstatSync(fName).isFile());
  const dirs = ruleSetDirContents.filter((fName) => fName !== `${rulesDirectory}/utils` && !(fs.lstatSync(fName).isFile()));
  files.forEach((file) => {
    const Rule = require(file);
    if (config && config.rules) {
      if (config.rules[Rule.ruleName] !== 'off') {
        const ruleInstance = new Rule(config.rules[Rule.ruleName]);
        ruleSet.push(ruleInstance);
      }
    } else {
      const ruleInstance = new Rule();
      ruleSet.push(ruleInstance);
    }
  });
  dirs.forEach((directory) => {
    const nestedRules = loadRuleset({ ...config, rulesPath: directory });
    ruleSet.push(...nestedRules);
  });
  return ruleSet;
}

export default loadRuleset;
