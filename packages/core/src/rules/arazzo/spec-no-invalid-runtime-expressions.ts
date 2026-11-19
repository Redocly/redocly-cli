import { parseRuntimeExpression } from '../../runtime-expressions/index.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

// The `{$sourceDescriptions.<name>.url}` part of `{$sourceDescriptions.<name>.url}#/paths/~1orders~1{orderId}/get`.
// A group without `$`, such as `{orderId}`, is a path template of the source description.
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
      parseRuntimeExpression(value, { startRule: 'RuntimeExpression', specVersion });
    } catch {
      report({
        message: `\`${value}\` is not a valid runtime expression.`,
        location: location.child([field]),
        reference: 'https://redocly.com/docs/cli/rules/arazzo/spec-no-invalid-runtime-expressions',
      });
    }
  }

  return {
    Outputs(outputs: Record<string, unknown>, ctx: UserContext) {
      for (const [outputName, outputValue] of Object.entries(outputs)) {
        checkExpression(outputValue, ctx, outputName);
      }
    },
    Step(step, ctx) {
      for (const field of STEP_PATH_FIELDS) {
        const path = step[field];
        if (typeof path !== 'string') continue;

        for (const [, expression] of path.matchAll(EMBEDDED_EXPRESSION)) {
          checkExpression(expression, ctx, field);
        }
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
