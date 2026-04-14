import {
  isTruthy,
  type Oas3ComponentName,
  type Oas3Components,
  type Oas3Schema,
  type Oas3_1Components,
  type Oas3_1Schema,
} from '@redocly/openapi-core';

import type { ComponentsFiles } from '../types.js';

export function gatherComponentsFiles(
  components: Oas3Components | Oas3_1Components,
  componentsFiles: ComponentsFiles,
  componentType: Oas3ComponentName<Oas3Schema | Oas3_1Schema>,
  componentName: string,
  filename: string
) {
  let inherits: string[] = [];
  if (componentType === 'schemas') {
    inherits = (
      (components?.[componentType]?.[componentName] as Oas3Schema | Oas3_1Schema)?.allOf || []
    )
      .map(({ $ref }) => $ref)
      .filter(isTruthy);
  }
  componentsFiles[componentType] = componentsFiles[componentType] || {};
  componentsFiles[componentType][componentName] = { inherits, filename };
}
