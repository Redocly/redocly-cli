import { type Replacement } from '../../types';

const JsonPointerLib = require('json-pointer');

export function handlePayloadReplacements(payload: object, replacements: Replacement[]) {
  for (const replacement of replacements) {
    const { target, value } = replacement;

    if (typeof target !== 'string') {
      throw new Error(`Invalid JSON Pointer: ${target}`);
    }

    try {
      // Get the current value using JSON Pointer
      const currentValue = JsonPointerLib.get(payload, target);

      if (currentValue !== undefined) {
        // Replace the value using JSON Pointer
        JsonPointerLib.set(payload, target, value);
      }
    } catch {
      throw new Error(`Invalid JSON Pointer: ${target}`);
    }
  }
}
