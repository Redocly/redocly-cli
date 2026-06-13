import { isRef } from '../ref-utils.js';
import type { Async2Operation, Async2OperationTrait } from '../typings/asyncapi.js';
import type { Async3Operation, Async3OperationTrait } from '../typings/asyncapi3.js';
import type { UserContext } from '../walk.js';

type SecuredOperation = Async2Operation | Async3Operation;
type SecuredTrait = Async2OperationTrait | Async3OperationTrait;

export function isOperationSecured(
  operation: SecuredOperation | undefined,
  resolve: UserContext['resolve']
): boolean {
  if (operation?.security) return true;
  if (!Array.isArray(operation?.traits)) return false;
  for (const trait of operation.traits) {
    const traitNode = isRef(trait) ? resolve<SecuredTrait>(trait).node : trait;
    if (traitNode?.security) return true;
  }
  return false;
}
