import { asserts, runOnKeysSet, runOnValuesSet } from './asserts';
import { AssertToApply, buildSubjectVisitor, buildVisitorObject } from './utils';
import { Oas2Rule, Oas3Rule } from '../../../visitors';

export const Assertions: Oas3Rule | Oas2Rule = (opts: object) => {
  let visitors: any[] = [];

  // As 'Assertions' has an array of asserts,
  // that array spreads into an 'opts' object on init rules phase here
  // https://github.com/Redocly/redocly-cli/blob/master/packages/core/src/config/config.ts#L311
  // that is why we need to iterate through 'opts' values;
  // before - filter only object 'opts' values
  const assertions: any[] = Object.values(opts).filter(
    (opt: unknown) => typeof opt === 'object' && opt !== null,
  );

  for (const [index, assertion] of assertions.entries()) {
    const assertId =
      (assertion.assertionId && `${assertion.assertionId} assertion`) || `assertion #${index + 1}`;

    if (!assertion.subject) {
      throw new Error(`${assertId}: 'subject' is required`);
    }

    const subjects: string[] = Array.isArray(assertion.subject)
      ? assertion.subject
      : [assertion.subject];

    const assertsToApply: AssertToApply[] = Object.keys(asserts)
      .filter((assertName: string) => assertion[assertName] !== undefined)
      .map((assertName: string) => {
        return {
          assertId,
          name: assertName,
          conditions: assertion[assertName],
          message: assertion.message,
          severity: assertion.severity || 'error',
          suggest: assertion.suggest || [],
          runsOnKeys: runOnKeysSet.has(assertName),
          runsOnValues: runOnValuesSet.has(assertName),
        };
      });

    const shouldRunOnKeys: AssertToApply | undefined = assertsToApply.find(
      (assert: AssertToApply) => assert.runsOnKeys && !assert.runsOnValues,
    );
    const shouldRunOnValues: AssertToApply | undefined = assertsToApply.find(
      (assert: AssertToApply) => assert.runsOnValues && !assert.runsOnKeys,
    );

    if (shouldRunOnValues && !assertion.property) {
      throw new Error(
        `${shouldRunOnValues.name} can't be used on all keys. Please provide a single property.`,
      );
    }

    if (shouldRunOnKeys && assertion.property) {
      throw new Error(
        `${shouldRunOnKeys.name} can't be used on a single property. Please use 'property'.`,
      );
    }

    for (const subject of subjects) {
      const subjectVisitor = buildSubjectVisitor(
        assertion.property,
        assertsToApply,
        assertion.context,
      );
      const visitorObject = buildVisitorObject(subject, assertion.context, subjectVisitor);
      visitors.push(visitorObject);
    }
  }

  return visitors;
};
