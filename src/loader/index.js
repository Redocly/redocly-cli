import path from 'path';
import fs from 'fs';

function getObjByPathOrParent(json, JSONPath) {
  const get = (p, o) => p.reduce((xs, x) => ((xs && xs[x]) ? xs[x] : null), o);
  return get(JSONPath.split('.'), json);
}

function loadRuleset(config) {
  const ruleSet = [];
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
    const ruleInstanceInit = new Rule();
    let ruleConfig = getObjByPathOrParent(configCopy.rules, ruleInstanceInit.rule.replace('/', '.'));
    const s = ruleInstanceInit.rule.split('/')[0];
    if (!ruleConfig) {
      ruleConfig = getObjByPathOrParent(configCopy.rules, s);

      if (ruleConfig && typeof ruleConfig === 'object') {
        const allowed = ['level'];

        ruleConfig = Object.keys(ruleConfig)
          .filter((key) => allowed.includes(key))
          .reduce((obj, key) => {
            obj[key] = ruleConfig[key];
            return obj;
          }, {});
      }
    }

    if (configCopy && configCopy.rules) {
      if (ruleConfig === 'on' || ruleConfig === true || (typeof ruleConfig === 'object' && ruleConfig !== null)) {
        const ruleInstance = new Rule(ruleConfig);
        ruleSet.push(ruleInstance);
      }
    } else {
      const ruleInstance = new Rule();
      ruleSet.push(ruleInstance);
    }
  });

  dirs.forEach((dir) => {
    const nestedRules = loadRuleset({
      ...configCopy,
      rulesPath: dir,
    });
    ruleSet.push(...nestedRules);
  });

  return ruleSet;
}

export default loadRuleset;
