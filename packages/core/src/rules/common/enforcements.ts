const cases = ['camelCase', 'kebab-case', 'snake_case', 'PascalCase'];

const _rules: {} = {
  pattern: (value: string, pattern: string) => {
    if (!value) return true; // property doesn't exist, no need to lint it with this rule
    const regexOptions = pattern.match(/(\b\/\b)(.+)/g) || ['/'];
    pattern = pattern.slice(1).replace(regexOptions[0],'');
    const regx = new RegExp(pattern, regexOptions[0].slice(1));
    return !!value.match(regx);
  },
  enum: (value: string, keys: any) => {
    if (!value) return true; // property doesn't exist, no need to lint it with this rule
    return keys.includes(value);
  },
  defined: (value: string, _val: boolean = true) => {
    const isDefined = typeof value !== 'undefined';
    return _val ? isDefined : !isDefined;
  },
  undefined: (value: any, _val: boolean = true) => {
    const isUndefined = typeof value === 'undefined';
    return _val ? isUndefined : !isUndefined;
  },
  nonEmpty: (value: string, _val: boolean = true) => {
    const isEmpty = typeof value === 'undefined' || value === null || value === '';
    return _val ? !isEmpty : isEmpty;
  },
  length: (value: string | Array<any>, length: number) => {
    if (!value) return true; // property doesn't exist, no need to lint it with this rule
    return value.length === length;
  },
  casing: (value: string, style: string) => {
    if (!value) return true; // property doesn't exist, no need to lint it with this rule
    if (!cases.includes(style)) {
      // report wrong style name:
      return;
    }
    let matchCase = false;
    switch (style) {
      case 'camelCase':
        matchCase = !!(value.match(/^[a-z][a-zA-Z0-9]+$/g));
        break;
      case 'kebab-case':
        matchCase = !!(value.match(/^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/g));
        break;
      case 'snake_case':
        matchCase = !!(value.match(/^([a-z][a-z0-9]*)(_[a-z0-9]+)*$/g));
        break;
      case 'PascalCase':
        matchCase = !!(value.match(/^[A-Z][a-zA-Z0-9]+$/g));
        break;
    }
    return matchCase;
  },
  sortOrder: (value: Array<string>, _val: 'asc' | 'desc') => {
    if (!value || value.length === 1) return true;
    let isOrdered = true;
    switch (_val) {
      case 'asc':
        for (let i=1; i<value.length; i++) {
          if (value[i] < value[i-1]) {
            isOrdered = false;
            break;
          }
        }
        break;
      case 'desc':
        for (let i=1; i<value.length; i++) {
          if (value[i] > value[i-1]) {
            isOrdered = false;
            break;
          }
        }
        break;
    }
    return isOrdered;
  },
  mutuallyExclusive: (node: any, properties: Array<string>) => {
    let counter = 0;
    Object.keys(node).forEach(prop => {
      if (properties.includes(prop)) {
        counter++;
      }
    });
    return counter < 2;
  },
  mutuallyRequired: (node: any, properties: Array<string>) => {
    let counter = 0;
    Object.keys(node).forEach(prop => {
      if (properties.includes(prop)) {
        counter++;
      }
    });
    return counter === properties.length;
  }
}

export const Enforcements:any = (opts: any) => {
  let result = {};

  for (let key in opts) {
    const enforcement = opts[key];

    if (enforcement.on) {
      // get props and rules:
      const onProps = Array.isArray(enforcement.on) ? enforcement.on : [enforcement.on];
      const rulesToApply = Object.keys(_rules).filter((rule: string) => opts[key][rule] !== undefined)
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
                  const lintResult = _rules[rule.name](value, rule.conditions);
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
                    const lintResult = _rules[rule.name](value, rule.conditions);
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
