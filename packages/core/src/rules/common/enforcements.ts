import * as rules from '../generic-rules';

export const Enforcements:any = (opts: any) => {
  let result = {};

  for (let key in opts) {
    const enforcement = opts[key];

    if (enforcement.on) {
      // get props and rules:
      const onProps = Array.isArray(enforcement.on) ? enforcement.on : [enforcement.on];
      const rulesToApply = Object.keys(rules).filter((rule: string) => enforcement[rule] !== undefined)
        .map((rule: string) => ({name: rule, conditions: enforcement[rule], description: enforcement.description}));
      const hasMutuallyRule = !!(enforcement.mutuallyExclusive || enforcement.mutuallyRequired);

       // form rule for each property:
      onProps.forEach((onProp: string) => {
        const parts = onProp.split('.');
        if (parts.length < 2) return; // property should have parent node

        const lastProp: string | null = hasMutuallyRule ? null : parts.pop() as string; // property on which we will do the lint
        const lastNode: string = parts.pop() as string; // node that have this property

        if (parts.length === 0) {
          // @ts-ignore
          rulesToApply.forEach(rule => {
            result = {
              ...result,
              ...{
                [lastNode]: function(node: any, { report, location }: any) {
                  const value = hasMutuallyRule ? node : node[lastProp as string];
                  // @ts-ignore
                  const lintResult = rules[rule.name](value, rule.conditions);
                  if (!lintResult) {
                    report({
                      message: rule.description,
                      location: location.key(),
                    });
                  }
                }
              }
            }
          })
        } else {
          // @ts-ignore
          rulesToApply.forEach(rule => {
            const __res = parts.reverse().reduce((res, key, index) => {
              if (index === 0) {
                // @ts-ignore
                res = {[lastNode]: function(node: any, { report, location }: any) {
                    const value = hasMutuallyRule ? node : node[lastProp as string];
                    // @ts-ignore
                    const lintResult = rules[rule.name](value, rule.conditions);
                    if (!lintResult) {
                      report({
                        message: rule.description,
                        location: location.key(),
                      });
                    }
                  }}
              }
              return {[key]: res}
            }, {});
            result = {
              ...result,
              ...__res
            }
          })
         }
       });
     }
   }

  return result;
};
