import { isEmptyObject } from '@redocly/openapi-core';

import type {
  AnyAsyncApiDefinition,
  AsyncApi2SplittableComponent,
  AsyncApi3SplittableComponent,
} from '../types.js';

export function removeAsyncApiEmptyComponents(
  asyncapi: AnyAsyncApiDefinition,
  componentType: AsyncApi2SplittableComponent | AsyncApi3SplittableComponent
) {
  const components = asyncapi.components as Record<string, Record<string, unknown>> | undefined;
  if (!components) return;

  if (isEmptyObject(components[componentType])) {
    delete components[componentType];
  }

  if (isEmptyObject(components)) {
    delete asyncapi.components;
  }
}
