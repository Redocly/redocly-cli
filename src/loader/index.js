import path from 'path';
import fs from 'fs';

function loadRuleset(config) {
  const ruleSet = [];
  const configCopy = {
    ...config,
    rulesPath: config.rulesPath ? config.rulesPath : `${__dirname}/../extendedRules`,
  };
  let rulesDirectory = path.resolve(configCopy.rulesPath);
  if (!fs.existsSync(rulesDirectory)) {
    rulesDirectory = `${__dirname}/../extendedRules`;
  }
  const ruleSetDirContents = fs.readdirSync(rulesDirectory)
    .map((fName) => `${rulesDirectory}/${fName}`);
  const files = ruleSetDirContents.filter((fName) => fs.lstatSync(fName).isFile());

  files.forEach((file) => {
    const Rule = require(file);
    if (configCopy && configCopy.rules) {
      if (configCopy.rules[Rule.ruleName] !== 'off') {
        const ruleInstance = new Rule(configCopy.rules[Rule.ruleName]);
        ruleSet.push(ruleInstance);
      }
    } else {
      const ruleInstance = new Rule();
      ruleSet.push(ruleInstance);
    }
  });
  return ruleSet;
}

export default loadRuleset;
