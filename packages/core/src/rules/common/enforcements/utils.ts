import { ProblemSeverity, UserContext } from '../../../walk';
import { rules as genericRules } from './generic-rules';

export type OrderDirection = 'asc' | 'desc';

export type OrderOptions = {
  direction: OrderDirection;
  property?: string;
};

export type Rule = {
  name: string;
  conditions: any;
  description: string;
  severity: ProblemSeverity;
  runsOnKeys: boolean;
  runsOnValues: boolean;
};

export const ALL_KEYS = '$keys';

/** Sets the value at path of object. If a portion of path doesn't exist, it's created.  */
export const objectSet = (path: string[], value: any) => {
  return path.reverse().reduce((acc, key) => ({[key]: acc}), value);
}

export const formRule = (lastNodeName: string, propsToRules:  {[key: string]: Rule[]}) => {
  return {
    [lastNodeName]: function(node: any, { report, location }: UserContext) {
      for (const prop of Object.keys(propsToRules)) {
        for (const rule of propsToRules[prop]) {
          const value = prop === ALL_KEYS ? node : node[prop];
          const lintResult = (genericRules as {[key: string]: any})[rule.name](value, rule.conditions);
          if (!lintResult) {
            report({
              message: rule.description,
              location: prop === ALL_KEYS ? location.key() : location.child(prop).key(),
              forceSeverity: rule.severity
            });
          }
        }
      }
    }
  }
}

export const getCounts = (node: any, properties: string[]): number => {
  let counter = 0;
  for (const prop of Object.keys(node)) {
    if (properties.includes(prop)) {
      counter++;
    }
  }
  return counter;
}

export const isOrdered = (value: any[], options: OrderOptions | OrderDirection): boolean => {
  const direction = (options as OrderOptions).direction || options as OrderDirection;
  const property = (options as OrderOptions).property;
  let result = true;
  for (let i=1; i<value.length; i++) {
    let currValue = value[i];
    let prevVal = value[i-1];

    if (property) {
      if (!value[i][property] || !value[i-1][property]) {
        return false; // property doesn't exist, so collection is not ordered
      }
      currValue = value[i][property];
      prevVal = value[i-1][property]
    }

    result = direction === 'asc' ? currValue >= prevVal : currValue <= prevVal;
    if (!result) {
      break;
    }
  }
  return result;
}