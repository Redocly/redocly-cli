import { isTruthy } from '@redocly/openapi-core';
import * as path from 'node:path';

import { COMPONENTS } from '../constants.js';
import {
  type AnyAsyncApiComponents,
  type AnyAsyncApiDefinition,
  type ComponentsFiles,
} from '../types.js';
import { getFileNamePath, type FileNameConflict } from '../utils/get-file-name-path.js';
import { findAsyncApiComponentTypes } from './find-asyncapi-component-types.js';

export function gatherAsyncApiComponentFiles({
  asyncapi,
  asyncapiDir,
  componentsFiles,
  ext,
  specVersion,
  conflicts,
}: {
  asyncapi: AnyAsyncApiDefinition;
  asyncapiDir: string;
  componentsFiles: ComponentsFiles;
  ext: string;
  specVersion: 'async2' | 'async3';
  conflicts: FileNameConflict[];
}) {
  const components: AnyAsyncApiComponents | undefined = asyncapi.components;
  if (!components) return;
  const componentsDir = path.join(asyncapiDir, COMPONENTS);
  const componentTypes = findAsyncApiComponentTypes(components, specVersion);
  for (const componentType of componentTypes) {
    const componentDirPath = path.join(componentsDir, componentType);
    const takenFileNames = new Map<string, string>();
    for (const componentName of Object.keys(components[componentType] || {})) {
      const filename = getFileNamePath(
        componentDirPath,
        componentName,
        `.${ext}`,
        takenFileNames,
        conflicts
      );
      let inherits: string[] = [];
      if (componentType === 'schemas') {
        inherits = (
          (components[componentType]?.[componentName] as { allOf?: Array<{ $ref?: string }> })
            ?.allOf || []
        )
          .map(({ $ref }) => $ref)
          .filter(isTruthy);
      }
      componentsFiles[componentType] = componentsFiles[componentType] || {};
      componentsFiles[componentType][componentName] = { inherits, filename };
    }
  }
}
