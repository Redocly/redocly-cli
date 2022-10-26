import { asserts, AssertionFn } from './asserts';
import { buildSubjectVisitor, buildVisitorObject } from './utils';
import { Oas2Visitor, Oas3Visitor } from '../../../visitors';
import { RuleSeverity } from '../../../config';
import { isString } from '../../../utils';

export type AssertionLocators = {
  filterInParentKeys?: (string | number)[];
  filterOutParentKeys?: (string | number)[];
  matchParentKeys?: string;
};

export type AssertionDefinition = {
  subject: {
    type: string;
    property?: string | string[];
  } & AssertionLocators;
  assertions: { [name in keyof typeof asserts]?: AssertionFn };
};

export type RawAssertion = AssertionDefinition & {
  where?: AssertionDefinition[];
  message?: string;
  suggest?: string[];
  severity?: RuleSeverity;
};

export type Assertion = RawAssertion & { assertionId: string };

export const Assertions = (opts: Record<string, Assertion>) => {
  const visitors: (Oas2Visitor | Oas3Visitor)[] = [];

  // As 'Assertions' has an array of asserts,
  // that array spreads into an 'opts' object on init rules phase here
  // https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/config/config.ts#L311
  // that is why we need to iterate through 'opts' values;
  // before - filter only object 'opts' values
  const assertions: Assertion[] = Object.values(opts).filter(
    (opt: unknown) => typeof opt === 'object' && opt !== null
  );

  for (const [index, assertion] of assertions.entries()) {
    const assertId =
      (assertion.assertionId && `${assertion.assertionId} assertion`) || `assertion #${index + 1}`;

    if (!isString(assertion.subject.type)) {
      throw new Error(`${assertId}: 'type' (String) is required`);
    }

    const subjectVisitor = buildSubjectVisitor(assertId, assertion);
    const visitorObject = buildVisitorObject(assertion, subjectVisitor);
    visitors.push(visitorObject);
  }

  return visitors;
};
