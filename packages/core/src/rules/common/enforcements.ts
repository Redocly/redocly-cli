import * as genericRules from '../generic-rules';

type Rule = {
  name: string,
  conditions: any,
  description: string
}

const formRule = (rule: Rule, parts: Array<string>, enforcement: {[key: string]: any}) => {
  const hasMutuallyRule = !!(enforcement.mutuallyExclusive || enforcement.mutuallyRequired);
  const lastProp: string = hasMutuallyRule ? '' : parts.pop() as string; // property on which we will do the lint
  const lastNode: string = parts.pop() as string; // node that have this property
  return {
    [lastNode]: function(node: any, { report, location }: any) {
      const value = hasMutuallyRule ? node : node[lastProp];
      // @ts-ignore
      const lintResult = genericRules[rule.name](value, rule.conditions);
      if (!lintResult) {
        report({
          message: rule.description,
          location: location.key(),
        });
      }
    }
  }
}

export const Enforcements:any = (opts: any) => {
  let rules = {};

  for (let key in opts) {
    const enforcement = opts[key];

    if (enforcement.on) {
      const onProps: Array<string> = Array.isArray(enforcement.on) ? enforcement.on : [enforcement.on];
      const rulesToApply: Array<Rule> = Object.keys(genericRules).filter((rule: string) => enforcement[rule] !== undefined)
        .map((rule: string) => ({name: rule, conditions: enforcement[rule], description: enforcement.description}));

       // form rule for each property:
      onProps.forEach((onProp: string) => {
        const parts = onProp.split('.');
        if (parts.length < 2) return; // property should have parent node

        if (parts.length === 0) {
          rulesToApply.forEach(rule => {
            rules = {
              ...rules,
              ...formRule(rule, parts, enforcement)
            }
          })
        } else {
          rulesToApply.forEach(rule => {
            rules = {
              ...rules,
              ...parts.reverse().reduce((res, key, index) => {
                if (index === 0) {
                  res = formRule(rule, parts, enforcement);
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
