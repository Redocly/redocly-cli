import { rules as genericRules } from '../generic-rules';
import { UserContext } from '../../walk';
import { Oas2Rule, Oas3Rule } from '../../visitors';

type Rule = {
  name: string,
  conditions: any,
  description: string
}

const formRule = (rule: Rule, lastProp: string, lastNode: string, hasMutuallyRule: boolean) => {
  return {
    [lastNode]: function(node: any, { report, location }: UserContext) {
      const value = hasMutuallyRule ? node : node[lastProp];
      const lintResult = (genericRules as {[key: string]: any})[rule.name](value, rule.conditions);
      if (!lintResult) {
        report({
          message: rule.description,
          location: location.key(),
        });
      }
    }
  }
}

export const Enforcements:  Oas3Rule | Oas2Rule = (opts: any) => {
  let rules = {};

  for (let key in opts) {
    const enforcement = opts[key];

    if (enforcement.on) {
      const onProps: Array<string> = Array.isArray(enforcement.on) ? enforcement.on : [enforcement.on];
      const rulesToApply: Array<Rule> = Object.keys(genericRules).filter((rule: string) => enforcement[rule] !== undefined)
        .map((rule: string) => ({name: rule, conditions: enforcement[rule], description: enforcement.description}));
      const hasMutuallyRule = !!(enforcement.mutuallyExclusive || enforcement.mutuallyRequired);
       // form rule for each property:
      onProps.forEach((onProp: string) => {
        const parts = onProp.split('.');
        if (parts.length === 1 && !hasMutuallyRule) return; // property should have parent node

        const lastProp: string = hasMutuallyRule ? '' : parts.pop() as string; // property on which we will do the lint
        const lastNode: string = parts.pop() as string; // node that have this property

        if (parts.length === 0) {
          rulesToApply.forEach(rule => {
            rules = {
              ...rules,
              ...formRule(rule, lastProp, lastNode, hasMutuallyRule)
            }
          })
        } else {
          rulesToApply.forEach(rule => {
            rules = {
              ...rules,
              ...parts.reverse().reduce((res, key, index) => {
                if (index === 0) {
                  res = formRule(rule, lastProp, lastNode, hasMutuallyRule);
                }
                return {[key]: res}
              }, {})
            }
          })
        }
      });
    }
  }

  return rules;
};
