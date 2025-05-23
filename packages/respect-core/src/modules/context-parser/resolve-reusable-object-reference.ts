import { getValueFromContext } from './get-value-from-context.js';

import type {
  ReusableObject,
  TestContext,
  OnSuccessObject,
  OnFailureObject,
  Parameter,
} from '../../types.js';

type ComponentType<T extends ReusableObject> =
  T['reference'] extends `$components.successActions${string}`
    ? OnSuccessObject
    : T['reference'] extends `$components.failureActions${string}`
    ? OnFailureObject
    : T['reference'] extends `$components.parameters${string}`
    ? Parameter
    : never;

const VALID_COMPONENTS = ['parameters', 'failureActions', 'successActions'];

export function resolveReusableObjectReference<T extends ReusableObject>(
  reusableObject: T,
  ctx: TestContext
): ComponentType<T> {
  const { reference, value: valueOverride } = reusableObject;

  if (!VALID_COMPONENTS.some((component) => reference.includes(`$components.${component}`))) {
    throw new Error(
      'Invalid reference: available components are $components.parameters, $components.failureActions, or $components.successActions'
    );
  }

  const component = getValueFromContext(reference, ctx);

  if ('value' in component && valueOverride) {
    return {
      ...component,
      value: valueOverride,
    } as ComponentType<T>;
  }

  return component as ComponentType<T>;
}
