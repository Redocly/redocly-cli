import {
  escapePointerFragment,
  isTruthy,
  type Oas3_1Schema,
  type Oas3Schema,
} from '@redocly/openapi-core';
import * as path from 'node:path';

import { COMPONENTS } from '../constants.js';
import type { AnyOas3Definition, ComponentsFiles } from '../types.js';
import { assertWithinDir } from './assert-within-dir.js';
import { findComponentTypes } from './find-component-type.js';
import { getFileNamePath, type FileNameConflict } from './get-file-name-path.js';

export function gatherComponentsFiles(
  openapi: AnyOas3Definition,
  openapiDir: string,
  componentsFiles: ComponentsFiles,
  ext: string,
  conflicts: FileNameConflict[]
) {
  const { components } = openapi;
  if (!components) return;
  const componentsDir = path.join(openapiDir, COMPONENTS);
  for (const componentType of findComponentTypes(components)) {
    const componentDirPath = path.join(componentsDir, componentType);
    const takenFileNames = new Map<string, string>();
    for (const componentName of Object.keys(components[componentType] || {})) {
      const filename = getFileNamePath(componentDirPath, componentName, ext, takenFileNames, {
        conflicts,
        pointer: `#/components/${componentType}/${escapePointerFragment(componentName)}`,
      });
      assertWithinDir(openapiDir, filename, componentName);
      let inherits: string[] = [];
      if (componentType === 'schemas') {
        inherits = (
          (components[componentType]?.[componentName] as Oas3Schema | Oas3_1Schema)?.allOf || []
        )
          .map(({ $ref }) => $ref)
          .filter(isTruthy);
      }
      componentsFiles[componentType] = componentsFiles[componentType] || {};
      componentsFiles[componentType][componentName] = { inherits, filename };
    }
  }
}
