import { ProblemSeverity, UserContext } from '../../../walk';
import { rules as genericRules } from './generic-rules';

export type Rule = {
  name: string,
  conditions: any,
  description: string,
  severity: ProblemSeverity
}

/** Sets the value at path of object. If a portion of path doesn't exist, it's created.  */
export const objectSet = (path: string[], value: any) => {
  return path.reverse().reduce((acc, key) => ({[key]: acc}), value);
}

export const formRule = (lastNodeName: string, propsToRules:  {[key: string]: Rule[]}) => {
  return {
    [lastNodeName]: function(node: any, { report, location }: UserContext) {
      for (const prop of Object.keys(propsToRules)) {
        for (const rule of propsToRules[prop]) {
          const value = prop === '__all' ? node : node[prop];
          const lintResult = (genericRules as {[key: string]: any})[rule.name](value, rule.conditions);
          if (!lintResult) {
            report({
              message: rule.description,
              location: prop === '__all' ? location.key() : location.child(prop).key(),
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

export const isOrdered = (value: string[], direction: 'asc' | 'desc'): boolean => {
  let result = true;
  for (let i=1; i<value.length; i++) {
    result = direction === 'asc' ? value[i] >= value[i-1] : value[i] <= value[i-1];
    if (!result) {
      break;
    }
  }
  return result;
}