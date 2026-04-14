import type { Oas3_1Components, Oas3Components } from '@redocly/openapi-core';

import { OPENAPI3_COMPONENT_NAMES } from '../oas/constants.js';
import { isNotSecurityComponentType } from './is-not-security-component-type.js';

export function findComponentTypes(components: Oas3Components | Oas3_1Components | undefined) {
  if (!components) return [];
  return OPENAPI3_COMPONENT_NAMES.filter(
    (item) => isNotSecurityComponentType(item) && Object.keys(components).includes(item)
  );
}
