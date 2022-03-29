import { asserts, runOnKeysMap, runOnValuesMap } from './asserts';
import { Assert, formLastVisitor, buildVisitorObject } from './utils';
import { Oas2Rule, Oas3Rule } from '../../../visitors';

export const Assertions: Oas3Rule | Oas2Rule = (opts: object) => {
  let visitors: any[] = [];

  // As 'Assertions' has an array of asserts,
  // that array spreads into an 'opts' object on init rules phase,
  // that is why we need to iterate through 'opts' values
  const assertions: any[] = Object.values(opts);

  for (const assertion of assertions) {
    if (!assertion.subject) {
      continue;
    }
    const subjects: string[] = Array.isArray(assertion.subject) ? assertion.subject : [assertion.subject];

    const assertsToApply: Assert[] =
      Object.keys(asserts)
        .filter((assert: string) => assertion[assert] !== undefined)
        .map((assert: string) => {
          return {
            name: assert,
            conditions: assertion[assert],
            message: assertion.message,
            severity: assertion.severity || 'error',
            suggest: assertion.suggest || [],
            runsOnKeys: runOnKeysMap.includes(assert),
            runsOnValues: runOnValuesMap.includes(assert)
          }
        });

    const shouldRunOnKeys: Assert | undefined = assertsToApply.find((assert: Assert) => assert.runsOnKeys && !assert.runsOnValues);
    const shouldRunOnValues: Assert | undefined = assertsToApply.find((assert: Assert) => assert.runsOnValues && !assert.runsOnKeys);

    if (shouldRunOnValues && !assertion.property) {
      throw new Error(`${shouldRunOnValues.name} can't be used on all keys. Please provide a single property.`);
    }

    if (shouldRunOnKeys && assertion.property) {
      throw new Error(`${shouldRunOnKeys.name} can't be used on a single property. Please use 'property'.`);
    }

    for (const subject of subjects) {
      const lastVisitor = formLastVisitor(assertion.property, assertsToApply, assertion.context);
      const visitorObject = assertion.context
        ? buildVisitorObject(subject, assertion.context, lastVisitor)
        : { [subject]: lastVisitor };

      visitors.push(visitorObject);
    }
  }

  return visitors;
};
