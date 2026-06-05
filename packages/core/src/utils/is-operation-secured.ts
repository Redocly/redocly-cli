import { isRef } from '../ref-utils.js';
import type { UserContext } from '../walk.js';

export function isOperationSecured(
  operation: { security?: unknown; traits?: unknown[] } | undefined,
  resolve: UserContext['resolve']
): boolean {
  if (operation?.security) return true;
  if (!Array.isArray(operation?.traits)) return false;
  for (const trait of operation.traits) {
    const traitNode = isRef(trait) ? resolve(trait).node : trait;
    if ((traitNode as { security?: unknown } | undefined)?.security) return true;
  }
  return false;
}
