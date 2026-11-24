import { parseRuntimeExpression } from '../../runtime-expressions/index.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

// An expression embedded in a string, such as `{$sourceDescriptions.<name>.url}` in
// `{$sourceDescriptions.<name>.url}#/paths/~1orders~1{orderId}/get`.
// A group without `$`, such as the path template `{orderId}`, is not an expression.
const EMBEDDED_EXPRESSION = /\{(\$[^{}]*)\}/g;

const STEP_PATH_FIELDS = [
  'operationPath',
  'channelPath', // added in Arazzo 1.1
] as const;

export const SpecNoInvalidRuntimeExpressions: Arazzo1Rule = () => {
  // The value can have a wrong type: this rule also runs on a description that `struct` rejects.
  function checkExpression(
    value: unknown,
    { report, location, specVersion }: UserContext,
    field: string
  ) {
    if (typeof value !== 'string') return;

    try {
      parseRuntimeExpression(value, {
        startRule: specVersion === 'arazzo1' ? 'Arazzo1Expression' : 'Arazzo1_1Expression',
      });
    } catch {
      report({
        message: `\`${value}\` is not a valid runtime expression.`,
        location: location.child([field]),
        reference: 'https://redocly.com/docs/cli/rules/arazzo/spec-no-invalid-runtime-expressions',
      });
    }
  }

  function checkEmbeddedExpressions(value: unknown, ctx: UserContext, field: string) {
    if (typeof value !== 'string') return;

    for (const [, expression] of value.matchAll(EMBEDDED_EXPRESSION)) {
      checkExpression(expression, ctx, field);
    }
  }

  return {
    Outputs(outputs: Record<string, unknown>, ctx: UserContext) {
      for (const [outputName, outputValue] of Object.entries(outputs)) {
        // Respect also evaluates a constant and a string with embedded expressions as an output value.
        if (typeof outputValue === 'string' && outputValue.startsWith('$')) {
          checkExpression(outputValue, ctx, outputName);
        } else {
          checkEmbeddedExpressions(outputValue, ctx, outputName);
        }
      }
    },
    Step(step, ctx) {
      for (const field of STEP_PATH_FIELDS) {
        checkEmbeddedExpressions(step[field], ctx, field);
      }
    },
    CriterionObject(criterion, ctx) {
      checkExpression(criterion.context, ctx, 'context');
    },
    // added in Arazzo 1.1
    SelectorObject(selector, ctx) {
      checkExpression(selector.context, ctx, 'context');
    },
    ReusableObject(reusableObject: { reference?: unknown }, ctx: UserContext) {
      checkExpression(reusableObject.reference, ctx, 'reference');
    },
  };
};
