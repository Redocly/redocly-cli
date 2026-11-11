import { isPlainObject, type LoggerInterface } from '@redocly/openapi-core';

import type { RuntimeExpressionContext } from '../../types.js';
import { getFakeData, parseJson } from '../context-parser/index.js';
import { interpretExpression } from './interpret-expression.js';
import { lintExpression } from './lint.js';

// Used when evaluating expressions in a string that can contain other text, like request bodies payload, output values, etc.
export function evaluateRuntimeExpressionPayload({
  payload,
  context,
  contentType,
  logger,
}: {
  payload: any;
  context: RuntimeExpressionContext;
  contentType?: string;
  logger: LoggerInterface;
}): any {
  if (contentType?.includes('application/octet-stream')) {
    return parseJson(payload, context, logger);
  }

  if (contentType?.includes('multipart/form-data')) {
    if (payload instanceof FormData) {
      const processedFormData = new FormData();

      for (const [key, value] of payload.entries()) {
        if (value instanceof File) {
          processedFormData.append(key, value);
        } else {
          const evaluatedValue = evaluateRuntimeExpressionPayload({
            payload: value,
            context,
            logger,
          });
          processedFormData.append(key, evaluatedValue);
        }
      }

      return processedFormData;
    }

    return parseJson(payload, context, logger);
  }

  if (typeof payload === 'string') {
    // Resolve string expressions
    return isPureRuntimeExpression(payload)
      ? evaluateRuntimeExpression(payload, context, logger)
      : evaluateExpressionsInString(payload, context, logger);
  } else if (isPlainObject(payload)) {
    return Object.entries(payload).reduce(
      (acc, [key, value]) => {
        acc[key] = evaluateRuntimeExpressionPayload({ payload: value, context, logger });
        return acc;
      },
      {} as Record<string, any>
    );
  } else if (Array.isArray(payload)) {
    return payload.map((item) =>
      evaluateRuntimeExpressionPayload({ payload: item, context, logger })
    );
  } else {
    // Return the payload as-is if it's not a string, object, or array
    return payload;
  }
}

// Evaluate runtime expressions in a given expression object. Used in SuccessCriteria conditions.
export function evaluateRuntimeExpression(
  expression: any,
  context: RuntimeExpressionContext,
  logger: LoggerInterface
): any {
  if (typeof expression === 'string') {
    return evaluateExpressionString(expression, context, logger);
  } else if (isPlainObject(expression)) {
    return Object.entries(expression).reduce(
      (acc, [key, value]) => {
        acc[key] = value && evaluateRuntimeExpression(value, context, logger);
        return acc;
      },
      {} as Record<string, any>
    );
  } else if (Array.isArray(expression)) {
    return expression.map((exp) => evaluateRuntimeExpression(exp, context, logger));
  } else {
    return expression;
  }
}

function evaluateExpressionString(
  expression: string,
  context: RuntimeExpressionContext,
  logger: LoggerInterface
) {
  // Replace $faker expressions with fake data as it is not the part of the Runtime
  // Expressions and should be evaluated separately
  if (/^\$faker\.[a-zA-Z0-9._-]+(\([^\\)]*\))?$/.test(expression)) {
    return getFakeData({ pointer: expression.slice(1), ctx: context, logger });
  } else if (expression.includes('$faker.')) {
    const fakerRegex = /\$faker\.[a-zA-Z0-9._-]+(\([^\\)]*\))?/g;
    expression = expression
      .replace(fakerRegex, (match) => {
        return getFakeData({ pointer: match.slice(1), ctx: context, logger });
      })
      .replace(/{(.*?)}/g, '$1');
  }

  if (!expression.includes('$') && !/[=<>]/.test(expression)) {
    return expression;
  }

  // Validate expression syntax to match ABNF Arazzo grammar
  lintExpression(expression);

  try {
    return interpretExpression(expression, context);
  } catch (error) {
    const cause = error instanceof Error ? `: ${error.message}` : '';
    throw new Error(
      `Error in resolving runtime expression '${expression}'${cause}. \n` +
        "This could be because the expression references a value from a previous failed step, or is trying to reference a variable that hasn't been set."
    );
  }
}

// Helper function to evaluate expressions within a string
function evaluateExpressionsInString(
  expression: string,
  context: RuntimeExpressionContext,
  logger: LoggerInterface
): string {
  const regex = /\{(?:[^{}]|\{[^{}]*\})*\}|\$[^\s{}]+(?:\([^()]*\))*/g;

  return expression.replace(regex, (match) => {
    const exprToEvaluate = match.trim();

    if (!isValidRuntimeExpression(exprToEvaluate) && !exprToEvaluate.includes('$faker.')) {
      // Braces that are not an expression, such as a JSON object, can still hold expressions.
      return match.startsWith('{')
        ? `{${evaluateExpressionsInString(match.slice(1, -1), context, logger)}}`
        : match;
    }

    // For dollar expressions, include the leading $ when passing to evaluateRuntimeExpression
    const evaluatedValue = evaluateRuntimeExpression(exprToEvaluate, context, logger);

    // Keeping the expression text would send it as a literal value, so fail instead
    if (evaluatedValue === undefined) {
      throw new Error(
        `Runtime expression '${exprToEvaluate}' has no value. \n` +
          'Check that it references a step or workflow that has already run and sets this output, or an input that is provided.'
      );
    }

    return evaluatedValue;
  });
}

export function isPureRuntimeExpression(expression: string): boolean {
  const trimmedExpression = expression.trim();

  if (trimmedExpression.startsWith('$faker.')) {
    return true;
  }

  if (
    !(
      (trimmedExpression.startsWith('$') && !/\s/.test(trimmedExpression)) ||
      (trimmedExpression.startsWith('{') && trimmedExpression.endsWith('}'))
    )
  ) {
    return false;
  }

  return isValidRuntimeExpression(trimmedExpression);
}

function isValidRuntimeExpression(expression: string): boolean {
  try {
    lintExpression(expression);
    return true;
  } catch {
    return false;
  }
}
