import type {
  OnFailureObject,
  OnSuccessObject,
  Parameter,
  TestContext,
} from '../../types';

import { resolveReusableObjectReference } from './resolve-reusable-object-reference';

export function resolveReusableComponentItem<
  T extends OnSuccessObject | OnFailureObject | Parameter,
>(item: T, ctx: TestContext): T {
  return 'reference' in item ? (resolveReusableObjectReference(item, ctx) as T) : item;
}
