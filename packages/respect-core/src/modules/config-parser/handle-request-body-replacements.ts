import JsonPointerLib from 'json-pointer';
import { evaluateRuntimeExpressionPayload } from '../runtime-expressions/index.js';
import { type RuntimeExpressionContext, type Replacement } from '../../types.js';

export function handlePayloadReplacements(
  payload: object,
  replacements: Replacement[],
  expressionContext: RuntimeExpressionContext
) {
  for (const replacement of replacements) {
    const { target, value } = replacement;

    if (typeof target !== 'string') {
      throw new Error(`Invalid JSON Pointer: ${target}`);
    }

    try {
      // Get the current value using JSON Pointer
      const currentValue = JsonPointerLib.get(payload, target);
      const evaluatedValue = evaluateRuntimeExpressionPayload({
        payload: value,
        context: expressionContext,
      });

      if (currentValue !== undefined) {
        // Replace the value using JSON Pointer
        JsonPointerLib.set(payload, target, evaluatedValue);
      }
    } catch {
      throw new Error(`Invalid JSON Pointer: ${target}`);
    }
  }
}
