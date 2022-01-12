import { ProblemSeverity, UserContext } from '../../../walk';
import { asserts } from './asserts';

export type OrderDirection = 'asc' | 'desc';

export type OrderOptions = {
  direction: OrderDirection;
  property: string;
};

export type Assert = {
  name: string;
  conditions: any;
  message?: string;
  severity?: ProblemSeverity;
  suggest?: string[];
  runsOnKeys: boolean;
  runsOnValues: boolean;
};

export const ALL_KEYS = '$keys';

/** Sets the value at path of object. If a portion of path doesn't exist, it's created.  */
export const objectSet = (path: string[], value: any) => {
  return path.reverse().reduce((acc, key) => ({[key]: acc}), value);
}

export const formVisitor = (lastNodeName: string, propsToAsserts:  {[key: string]: Assert[]}) => {
  return {
    [lastNodeName]: function(node: any, { report, location }: UserContext) {
      for (const prop of Object.keys(propsToAsserts)) {
        for (const assert of propsToAsserts[prop]) {
          const value = prop === ALL_KEYS ? Object.keys(node) : node[prop];
          const lintResult = (asserts as {[key: string]: any})[assert.name](value, assert.conditions);
          if (!lintResult) {
            report({
              message: assert.message  || `The assertion '${assert.name}' doesn't meet required conditions`,
              location: prop === ALL_KEYS ? location.key() : location.child(prop).key(),
              forceSeverity: assert.severity,
              suggest: assert.suggest
            });
          }
        }
      }
    }
  }
}

export const getCounts = (keys: string[], properties: string[]): number => {
  let counter = 0;
  for (const key of keys) {
    if (properties.includes(key)) {
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