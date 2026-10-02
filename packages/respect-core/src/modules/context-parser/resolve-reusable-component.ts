import type { OnFailureObject, OnSuccessObject, Parameter, TestContext } from '../../types.js';
import {
  resolveReusableObjectReference,
  type ReusableComponentKind,
} from './resolve-reusable-object-reference.js';

export function resolveReusableComponentItem<
  T extends OnSuccessObject | OnFailureObject | Parameter,
>(item: T, ctx: TestContext, componentKind: ReusableComponentKind): T {
  return 'reference' in item
    ? (resolveReusableObjectReference(item, ctx, componentKind) as T)
    : item;
}
