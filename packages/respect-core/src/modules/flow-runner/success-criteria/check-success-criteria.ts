import { JSONPath } from 'jsonpath-plus';
import {
  validateSuccessCriteria,
  isRegexpSuccessCriteria,
  isJSONPathSuccessCriteria,
} from './validate-success-criteria.js';
import { CHECKS } from '../../checks/index.js';
import { evaluateRuntimeExpression } from '../../runtime-expressions/index.js';
import { createRuntimeExpressionCtx } from '../context/index.js';

import type {
  TestContext,
  Check,
  RegexpSuccessCriteria,
  Step,
  CriteriaObject,
} from '../../../types.js';

export function checkCriteria({
  workflowId,
  step,
  criteria: criteriaList = [],
  ctx,
}: {
  workflowId?: string;
  step: Step;
  criteria?: CriteriaObject[];
  ctx: TestContext;
}): Check[] {
  validateSuccessCriteria(criteriaList);

  const checks: Check[] = [];

  if (!workflowId) {
    checks.push({
      name: CHECKS.SUCCESS_CRITERIA_CHECK,
      passed: false,
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

  criteriaList.forEach((criteria: CriteriaObject) => {
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
          passed: regex.test(
            evaluateRuntimeExpression(context, criteriaContext, ctx.options.logger)
          ),
          message: `Checking regex criteria: ${JSON.stringify(criteria)}`,
          severity: ctx.severity['SUCCESS_CRITERIA_CHECK'],
          condition: condition,
        });
      } else if (isJSONPathSuccessCriteria(criteria)) {
        const { context } = criteria;
        const data = evaluateRuntimeExpression(context, criteriaContext, ctx.options.logger);

        checks.push({
          name: CHECKS.SUCCESS_CRITERIA_CHECK,
          passed: evaluateJSONPAthCondition(condition, data),
          message: `Checking jsonpath criteria: ${condition}`,
          severity: ctx.severity['SUCCESS_CRITERIA_CHECK'],
          condition: condition,
        });
      } else {
        checks.push({
          name: CHECKS.SUCCESS_CRITERIA_CHECK,
          passed: evaluateRuntimeExpression(condition, criteriaContext, ctx.options.logger),
          message: `Checking simple criteria: ${JSON.stringify(criteria)}`,
          severity: ctx.severity['SUCCESS_CRITERIA_CHECK'],
          condition: condition,
        });
      }
    } catch (e: any) {
      checks.push({
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        message: `Failed to pass ${JSON.stringify(criteria)}: ${e.message}`,
        severity: ctx.severity['SUCCESS_CRITERIA_CHECK'],
        condition: criteria.condition,
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
