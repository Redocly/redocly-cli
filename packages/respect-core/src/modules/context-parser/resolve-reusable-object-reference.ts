import { isPlainObject } from '@redocly/openapi-core';

import type {
  ReusableObject,
  TestContext,
  OnSuccessObject,
  OnFailureObject,
  Parameter,
} from '../../types.js';
import { getValueFromContext } from './get-value-from-context.js';

type ComponentType<T extends ReusableObject> =
  T['reference'] extends `$components.successActions${string}`
    ? OnSuccessObject
    : T['reference'] extends `$components.failureActions${string}`
      ? OnFailureObject
      : T['reference'] extends `$components.parameters${string}`
        ? Parameter
        : never;

export type ReusableComponentKind = 'parameters' | 'successActions' | 'failureActions';

export function resolveReusableObjectReference<T extends ReusableObject>(
  reusableObject: T,
  ctx: TestContext,
  componentKind: ReusableComponentKind
): ComponentType<T> {
  const { reference, value: valueOverride } = reusableObject;

  // a parameter, success action, or failure action written as a reference
  // must point to that kind of component
  if (!reference.startsWith(`$components.${componentKind}.`)) {
    throw new Error(
      `Invalid reference ${reference}: it must point to $components.${componentKind}.`
    );
  }

  const component = getValueFromContext({ value: reference, ctx, logger: ctx.options.logger });

  if (isPlainObject(component) && 'value' in component && valueOverride !== undefined) {
    return {
      ...component,
      value: valueOverride,
    } as ComponentType<T>;
  }

  return component as ComponentType<T>;
}
