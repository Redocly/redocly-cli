import { resolveReusableObjectReference } from './resolve-reusable-object-reference.js';

import type { OnFailureObject, OnSuccessObject, Parameter, TestContext } from '../../types.js';

export function resolveReusableComponentItem<
  T extends OnSuccessObject | OnFailureObject | Parameter
>(item: T, ctx: TestContext): T {
  return 'reference' in item ? (resolveReusableObjectReference(item, ctx) as T) : item;
}
