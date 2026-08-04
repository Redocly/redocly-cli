import { isEmptyObject } from '@redocly/openapi-core';

import type {
  AnyAsyncApiComponents,
  AnyAsyncApiDefinition,
  AsyncApi2SplittableComponent,
  AsyncApi3SplittableComponent,
} from '../types.js';

export function removeAsyncApiEmptyComponents(
  asyncapi: AnyAsyncApiDefinition,
  componentType: AsyncApi2SplittableComponent | AsyncApi3SplittableComponent
) {
  const components: AnyAsyncApiComponents | undefined = asyncapi.components;
  if (!components) return;

  if (isEmptyObject(components[componentType])) {
    delete components[componentType];
  }

  if (isEmptyObject(components)) {
    delete asyncapi.components;
  }
}
