import { Problem, ProblemSeverity, UserContext } from '../../../walk';
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

export const buildVisitorObject = (subject: string, context: Record<string, any>[], lastVisitor: any) => {
  let tmp: Record<string, any> = {};
  const visitor: Record<string, any> = tmp;

  for (let index=0; index < context.length; index++) {
    const node = context[index];
    if (context.length === index + 1 && node.type === subject) {
      // no need to create separate visitor for the last element
      // which is the same as subject;
      // will check includes/excludes it in the last visitor.
      continue;
    }
    const matchParentKeys = node.matchParentKeys;
    const excludeParentKeys = node.excludeParentKeys;

    if (matchParentKeys || excludeParentKeys) {
      tmp[node.type] = {
        skip: (_value: any, key: string) => {
          if (matchParentKeys) {
            return !matchParentKeys.includes(key);
          }
          if (excludeParentKeys) {
            return excludeParentKeys.includes(key);
          }
        }
      }
    } else {
      tmp[node.type] = {}
    }
    tmp = tmp[node.type];
  }

  tmp[subject] = lastVisitor;

  return visitor;
}

export const formLastVisitor = (properties: string | string[], asserts: Assert[], _context?: Record<string, any>[]) =>
  function(node: any, { report, location, key, type }: UserContext) {

    // check context for same node type parent includes/excludes:
    if (_context) {
      const lastContextNode = _context[_context.length-1];
      if (lastContextNode.type === type.name) {
        const matchParentKeys = lastContextNode.matchParentKeys;
        const excludeParentKeys = lastContextNode.excludeParentKeys;

        if (matchParentKeys && !matchParentKeys.includes(key)) {
          return;
        }
        if (excludeParentKeys && excludeParentKeys.includes(key)) {
          return;
        }
      }
    }

    for (const assert of asserts) {
      if (properties) {
        properties = Array.isArray(properties) ? properties : [properties]
        for (const property of properties) {
          doLint(node[property], assert, location.child(property).key(), report);
        }
      } else {
        doLint(Object.keys(node), assert, location.key(), report);
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

function doLint(values: string | string[], assert: Assert, location: any, report: (problem: Problem) => void) {
  const lintResult = (asserts as { [key: string]: any })[assert.name](values, assert.conditions);
  if (!lintResult) {
    report({
      message: assert.message || `The assertion '${assert.name}' doesn't meet required conditions`,
      location,
      forceSeverity: assert.severity,
      suggest: assert.suggest,
    });
  }
}