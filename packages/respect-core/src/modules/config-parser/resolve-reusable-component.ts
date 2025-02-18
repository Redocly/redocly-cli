import { resolveReusableObjectReference } from './resolve-reusable-object-reference';

import type { OnFailureObject, OnSuccessObject, Parameter, TestContext } from '../../types';

export function resolveReusableComponentItem<
  T extends OnSuccessObject | OnFailureObject | Parameter
>(item: T, ctx: TestContext): T {
  return 'reference' in item ? (resolveReusableObjectReference(item, ctx) as T) : item;
}
