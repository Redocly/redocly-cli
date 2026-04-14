import {
  isEmptyObject,
  type Oas3Schema,
  type Oas3_1Schema,
  type Oas3ComponentName,
} from '@redocly/openapi-core';

import { type AnyOas3Definition } from '../types.js';

export function removeEmptyComponents(
  openapi: AnyOas3Definition,
  componentType: Oas3ComponentName<Oas3Schema | Oas3_1Schema>
) {
  if (openapi.components && isEmptyObject(openapi.components[componentType])) {
    delete openapi.components[componentType];
  }
  if (isEmptyObject(openapi.components)) {
    delete openapi.components;
  }
}
