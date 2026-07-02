import { isTruthy } from '@redocly/openapi-core';
import * as path from 'node:path';

import { COMPONENTS } from '../constants.js';
import { type ComponentsFiles, type AnyAsyncApiDefinition } from '../types.js';
import { getFileNamePath } from '../utils/get-file-name-path.js';
import { findAsyncApiComponentTypes } from './find-asyncapi-component-types.js';

export function gatherAsyncApiComponentFiles({
  asyncapi,
  asyncapiDir,
  componentsFiles,
  ext,
  specVersion,
}: {
  asyncapi: AnyAsyncApiDefinition;
  asyncapiDir: string;
  componentsFiles: ComponentsFiles;
  ext: string;
  specVersion: 'async2' | 'async3';
}) {
  const { components } = asyncapi;
  if (!components) return;
  const componentsDir = path.join(asyncapiDir, COMPONENTS);
  const componentTypes = findAsyncApiComponentTypes(components, specVersion);
  for (const componentType of componentTypes) {
    const componentDirPath = path.join(componentsDir, componentType);
    for (const componentName of Object.keys(components[componentType] || {})) {
      const filename = getFileNamePath(componentDirPath, componentName, ext);
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
