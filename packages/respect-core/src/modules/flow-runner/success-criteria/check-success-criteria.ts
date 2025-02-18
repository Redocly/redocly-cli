import { JSONPath } from 'jsonpath-plus';
import {
  validateSuccessCriteria,
  isRegexpSuccessCriteria,
  isJSONPathSuccessCriteria,
} from './validate-success-criteria';
import { CHECKS } from '../../checks';
import { evaluateRuntimeExpression } from '../../runtime-expressions';
import { createRuntimeExpressionCtx } from '../context';

import type {
  TestContext,
  Check,
  RegexpSuccessCriteria,
  Step,
  CriteriaObject,
} from '../../../types';

export function checkCriteria({
  workflowId,
  step,
  criteria = [],
  ctx,
}: {
  workflowId?: string;
  step: Step;
  criteria?: CriteriaObject[];
  ctx: TestContext;
}): Check[] {
  validateSuccessCriteria(criteria);

  const checks: Check[] = [];

  if (!workflowId) {
    checks.push({
      name: CHECKS.SUCCESS_CRITERIA_CHECK,
      pass: false,
      message: `Undefined workflowId for step ${step.stepId}`,
      severity: ctx.severity['SUCCESS_CRITERIA_CHECK'],
    });

    return checks;
  }

  const criteriaContext = createRuntimeExpressionCtx({
    ctx,
    workflowId,
    step,
  });

  criteria.forEach((criteria: CriteriaObject) => {
    const { condition } = criteria;

    try {
      if (isRegexpSuccessCriteria(criteria)) {
        const regexParts = condition.match(/^\/(.*)\/([gimsuy]*)$/);

        let regexPattern: string;
        let flags: string;

        if (regexParts) {
          regexPattern = regexParts[1]; // Extract pattern between the first and last slash
          flags = regexParts[2]; // Extract flags after the last slash
        } else {
          regexPattern = condition; // If no slashes are present, treat the whole string as the pattern
          flags = ''; // No flags in this case
        }

        const { context } = criteria as RegexpSuccessCriteria;
        const regex = new RegExp(regexPattern, flags);

        checks.push({
          name: CHECKS.SUCCESS_CRITERIA_CHECK,
          pass: regex.test(evaluateRuntimeExpression(context, criteriaContext)),
          message: `Checking regex criteria: ${JSON.stringify(criteria)}`,
          severity: ctx.severity['SUCCESS_CRITERIA_CHECK'],
        });
      } else if (isJSONPathSuccessCriteria(criteria)) {
        const { context, condition } = criteria;
        const data = evaluateRuntimeExpression(context, criteriaContext);

        checks.push({
          name: CHECKS.SUCCESS_CRITERIA_CHECK,
          pass: evaluateJSONPAthCondition(condition, data),
          message: `Checking jsonpath criteria: ${condition}`,
          severity: ctx.severity['SUCCESS_CRITERIA_CHECK'],
        });
      } else {
        checks.push({
          name: CHECKS.SUCCESS_CRITERIA_CHECK,
          pass: evaluateRuntimeExpression(condition, criteriaContext),
          message: `Checking simple criteria: ${JSON.stringify(criteria)}`,
          severity: ctx.severity['SUCCESS_CRITERIA_CHECK'],
        });
      }
    } catch (e: any) {
      checks.push({
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        pass: false,
        message: `Failed to pass ${JSON.stringify(criteria)}: ${e.message}`,
        severity: ctx.severity['SUCCESS_CRITERIA_CHECK'],
      });
    }
  });

  return checks;
}

function evaluateJSONPAthCondition(condition: string, context: Record<string, any>) {
  // Extract JSONPath expressions from the string
  const jsonpathMatches = condition.match(/\$\.[a-zA-Z0-9_]+/g) || [];

  // Replace JSONPath expressions with their values
  const replacedCondition = jsonpathMatches.reduce((acc, match) => {
    const jsonpathResult = JSONPath({ path: match, json: context });
    const jsonpathResultValue = jsonpathResult[0] || null;
    return acc.replace(match, JSON.stringify(jsonpathResultValue));
  }, condition);

  try {
    const evaluateFn = new Function(`return ${replacedCondition};`);
    return !!evaluateFn();
  } catch (_error) {
    return false;
  }
}
