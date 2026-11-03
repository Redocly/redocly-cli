import { isPlainObject, logger } from '@redocly/openapi-core';
import { AsyncLocalStorage } from 'node:async_hooks';
import { inspect } from 'node:util';

import type {
  GenerateClientFinding,
  GenerateClientFindingKind,
  GenerateClientOptions,
} from './types.js';

// The listener of the `generateClient` call that is running. The warnings come from deep in the
// pipeline, so the listener travels with the async context instead of through every call.
export const findingListener = new AsyncLocalStorage<GenerateClientOptions['onFinding']>();

// A record, so the type checker reports a kind that is missing here.
const FINDING_KINDS: Record<GenerateClientFindingKind, true> = {
  'operation-skipped': true,
  'name-changed': true,
  'option-ignored': true,
  'generator-replaced': true,
  'description-ignored': true,
  'undocumented-header': true,
  'browser-unsupported': true,
  'command-shadowed': true,
};

/**
 * Logs the finding as a warning and passes it to the `onFinding` listener of the run.
 * Throws on a value without the documented shape: a custom generator can pass anything.
 */
export function reportFinding(finding: GenerateClientFinding): void {
  if (!isFinding(finding)) {
    throw new Error(
      `invalid finding ${inspect(finding)}: a finding is { kind, message, operations }, with a known kind and the operation IDs as strings.`
    );
  }
  logger.warn(`generate-client: ${finding.message}\n`);
  // A custom generator can pass more keys, and the report holds only the documented ones.
  const { kind, message, operations } = finding;
  findingListener.getStore()?.({ kind, message, operations });
}

function isFinding(value: unknown): value is GenerateClientFinding {
  if (!isPlainObject(value)) {
    return false;
  }
  const { kind, message, operations } = value;
  if (typeof kind !== 'string' || !Object.hasOwn(FINDING_KINDS, kind)) {
    return false;
  }
  if (typeof message !== 'string' || !Array.isArray(operations)) {
    return false;
  }
  for (const operation of operations) {
    if (typeof operation !== 'string') {
      return false;
    }
  }
  return true;
}
