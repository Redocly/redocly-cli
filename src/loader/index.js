import path from 'path';
import fs from 'fs';

/**
 * Converts a string path to a value that is existing in a json object.
 *
 * @param {Object} jsonData Json data to use for searching the value.
 * @param {Object} path the path to use to find the value.
 * @returns {valueOfThePath|undefined}
 */
function jsonPathToValue(jsonData, JSONPath) {
  if (!(jsonData instanceof Object) || typeof (JSONPath) === 'undefined') {
    return null;
  }
  let data = jsonData;
  let expandedPath = JSONPath.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
  expandedPath = JSONPath.replace(/^\./, ''); // strip a leading dot
  const pathArray = expandedPath.split('.');
  for (let i = 0, n = pathArray.length; i < n && !(pathArray.length === 1 && pathArray[0] === ''); ++i) {
    const key = pathArray[i];
    if (key in data) {
      if (data[key] !== null) {
        data = data[key];
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  return data;
}

function getObjByPathOrParent(json, JSONPath) {
  if (!json) return null;
  let result = null;
  const elementPath = JSONPath;
  result = jsonPathToValue(json, JSONPath);
  if (!result) return null;
  while (!result) {
    const pathArray = elementPath.split('.');
    pathArray.pop();
    result = jsonPathToValue(json, pathArray.join('.'));
  }
  return result;
}

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

  const dirs = ruleSetDirContents
    .filter((fName) => !fs.lstatSync(fName).isFile() && fName.indexOf('utils') === -1);

  files.forEach((file) => {
    const Rule = require(file);
    const ruleInstanceInit = new Rule();
    let ruleConfig = getObjByPathOrParent(configCopy.rules, ruleInstanceInit.rule.replace('/', '.'));
    if (configCopy && configCopy.rules) {
      if (ruleConfig !== 'off') {
        const s = ruleInstanceInit.rule.split('/')[0];
        // console.log(ruleInstanceInit.rule, ruleConfig);

        if (!ruleConfig) {
          ruleConfig = getObjByPathOrParent(configCopy.rules, s);

          if (typeof ruleConfig === 'object') {
            const allowed = ['level'];

            ruleConfig = Object.keys(ruleConfig)
              .filter((key) => allowed.includes(key))
              .reduce((obj, key) => {
                obj[key] = ruleConfig[key];
                return obj;
              }, {});
          }

          // console.log(ruleConfig);
        }
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
