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

function embeddedExpressions(text: string): string[] {
  return Array.from(text.matchAll(EMBEDDED_EXPRESSION), ([, expression]) => expression);
}

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

  return {
    Outputs(outputs: Record<string, unknown>, ctx: UserContext) {
      for (const [outputName, outputValue] of Object.entries(outputs)) {
        if (typeof outputValue !== 'string') continue;

        // Respect also evaluates a constant, a string with embedded expressions, and a `$faker`
        // expression as an output value.
        const expressions = outputValue.startsWith('$')
          ? [outputValue]
          : embeddedExpressions(outputValue);
        for (const expression of expressions) {
          if (!expression.startsWith('$faker.')) checkExpression(expression, ctx, outputName);
        }
      }
    },
    Step(step, ctx) {
      for (const field of STEP_PATH_FIELDS) {
        const path = step[field];
        if (typeof path !== 'string') continue;

        for (const expression of embeddedExpressions(path)) {
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
