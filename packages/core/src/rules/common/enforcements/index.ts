import { rules as genericRules } from './generic-rules';
import { ALL_PROPS, Rule, formRule, objectSet } from './utils';
import { Oas2Rule, Oas3Rule } from '../../../visitors';

export const Enforcements: Oas3Rule | Oas2Rule = (opts: object) => {
  let visitors = {};
  let rulesMap: {[key: string]: any} = {};

  // As 'enforcements' rule has an array of sub-rules,
  // that array spreads into an 'opts' object on init rules phase,
  // that is why we need to iterate through 'opts' values
  const enforcements: any[] = Object.values(opts);

  for (const enforcement of enforcements) {
    if (!enforcement.on) {
      continue;
    }
    const onProps: string[] = Array.isArray(enforcement.on) ? enforcement.on : [enforcement.on];

    const rulesToApply: Rule[] =
      Object.keys(genericRules)
        .filter((rule: string) => enforcement[rule] !== undefined)
        .map((rule: string) => ({
          name: rule,
          conditions: enforcement[rule],
          description: enforcement.description,
          severity: enforcement.severity || 'error'
        }));

    const hasMutuallyRule = !!(enforcement.mutuallyExclusive || enforcement.mutuallyRequired);
    // form rule for each property:
    for (const onProp of onProps) {
      const parts = onProp.split('.');
      if (parts.length === 1 && !hasMutuallyRule) break; // property should have parent node

      // get property on which we will do the lint, 'ALL_PROPS' means on all the properties
      const lastProp: string = hasMutuallyRule ? ALL_PROPS : parts.pop() as string;

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
