import JsonPointerLib from 'json-pointer';
import { evaluateRuntimeExpressionPayload } from '../runtime-expressions/index.js';
import { type RuntimeExpressionContext, type Replacement } from '../../types.js';
import { type LoggerInterface } from '@redocly/openapi-core';

export function handlePayloadReplacements({
  payload,
  replacements,
  expressionContext,
  logger,
}: {
  payload: object;
  replacements: Replacement[];
  expressionContext: RuntimeExpressionContext;
  logger: LoggerInterface;
}) {
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
        logger,
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
