import { rules as genericRules, runOnKeysMap, runOnValuesMap } from './generic-rules';
import { ALL_KEYS, Rule, formRule, objectSet } from './utils';
import { Oas2Rule, Oas3Rule } from '../../../visitors';

export const Assertions: Oas3Rule | Oas2Rule = (opts: object) => {
  let visitors = {};
  let rulesMap: {[key: string]: any} = {};

  // As 'Assertions' has an array of rules,
  // that array spreads into an 'opts' object on init rules phase,
  // that is why we need to iterate through 'opts' values
  const assertions: any[] = Object.values(opts);

  for (const assertion of assertions) {
    if (!assertion.on) {
      continue;
    }
    const onProps: string[] = Array.isArray(assertion.on) ? assertion.on : [assertion.on];

    const rulesToApply: Rule[] =
      Object.keys(genericRules)
        .filter((rule: string) => assertion[rule] !== undefined)
        .map((rule: string) => {
          return {
            name: rule,
            conditions: assertion[rule],
            message: assertion.message,
            severity: assertion.severity || 'error',
            suggest: assertion.suggest || [],
            runsOnKeys: runOnKeysMap.includes(rule),
            runsOnValues: runOnValuesMap.includes(rule)
          }
        });

    const shouldRunOnKeys: Rule | undefined = rulesToApply.find((rule: Rule) => rule.runsOnKeys && !rule.runsOnValues);
    const shouldRunOnValues: Rule | undefined = rulesToApply.find((rule: Rule) => rule.runsOnValues && !rule.runsOnKeys);

    const pathsEndsWithAllKeys: number = onProps.filter(item => item.endsWith(ALL_KEYS)).length;
    if (onProps.length > 1 && pathsEndsWithAllKeys > 0 && pathsEndsWithAllKeys < onProps.length) {
      // we can't use $keys and regular property in one assertion, throw an error:
      throw new Error(`'${ALL_KEYS}' and properties can't be used together.`);
    }

    // form rule for each property:
    for (const onProp of onProps) {
      const parts = onProp.split('.');

      if (parts.length < 2) {
        // Path should have the right format NodeName.property
        throw new Error(`Path to the property should contain parent node name and the property itself. ` +
          `Please use '${ALL_KEYS}' or provide a property.`);
      }

      // get property on which we will do the lint:
      const lastProp = parts.pop() as string;

      if (shouldRunOnValues && lastProp === ALL_KEYS) {
        throw new Error(`${shouldRunOnValues.name} can't be used on all keys. Please provide a single property.`);
      }

      if (shouldRunOnKeys && lastProp !== ALL_KEYS) {
        throw new Error(`${shouldRunOnKeys.name} can't be used on a single property. Please use '${ALL_KEYS}'.`);
      }

      const path = parts.join('.');
      if (!rulesMap[path]) {
        rulesMap[path] = {};
      }
      rulesMap[path][lastProp] = rulesToApply;
    }
  }

  for (let path of Object.keys(rulesMap)) {
    let visitor = {};
    const pathParts = path.split('.');
    const lastNode = pathParts.pop() as string;
    if (pathParts.length) {
      visitor = objectSet(pathParts, formRule(lastNode, rulesMap[path]));
    } else {
      visitor = formRule(lastNode, rulesMap[path]);
    }

    visitors = {
      ...visitors,
      ...visitor
    }
  }
  return visitors;
};
