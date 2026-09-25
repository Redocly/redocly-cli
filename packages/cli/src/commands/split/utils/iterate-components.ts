import {
  escapePointerFragment,
  isTruthy,
  logger,
  type Oas3_1Schema,
  type Oas3ComponentName,
  type Oas3Schema,
} from '@redocly/openapi-core';
import { blue } from 'colorette';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { writeToFileByExtension } from '../../../utils/miscellaneous.js';
import { COMPONENTS } from '../constants.js';
import type { AnyOas3Definition, ComponentsFiles } from '../types.js';
import { assertWithinDir } from './assert-within-dir.js';
import { createComponentDir } from './create-component-dir.js';
import { doesFileDiffer } from './does-file-differ.js';
import { findComponentTypes } from './find-component-type.js';
import { getFileNamePath, type FileNameConflict } from './get-file-name-path.js';
import { implicitlyReferenceDiscriminator } from './implicitly-reference-discriminator.js';
import { removeEmptyComponents } from './remove-empty-components.js';
import { replace$Refs } from './replace-$-refs.js';

export function gatherOasComponentFiles(
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

export function iterateComponents(
  openapi: AnyOas3Definition,
  openapiDir: string,
  componentsFiles: ComponentsFiles
) {
  const { components } = openapi;
  if (components) {
    const componentsDir = path.join(openapiDir, COMPONENTS);
    fs.mkdirSync(componentsDir, { recursive: true });
    const componentTypes = findComponentTypes(components);
    componentTypes.forEach(iterateComponentTypes);

    function iterateComponentTypes(componentType: Oas3ComponentName<Oas3Schema | Oas3_1Schema>) {
      const componentDirPath = path.join(componentsDir, componentType);
      createComponentDir(componentDirPath, componentType);
      for (const componentName of Object.keys(components?.[componentType] || {})) {
        const { filename } = componentsFiles[componentType][componentName];
        const componentData = components?.[componentType]?.[componentName];
        replace$Refs(componentData, path.dirname(filename), componentsFiles);
        implicitlyReferenceDiscriminator(
          componentData,
          componentName,
          filename,
          componentsFiles.schemas || {}
        );

        if (doesFileDiffer(filename, componentData)) {
          logger.warn(
            `warning: conflict for ${componentName} - file already exists with different content: ${blue(
              filename
            )} ... Skip.\n`
          );
        } else {
          writeToFileByExtension(componentData, filename);
        }

        delete openapi.components?.[componentType]?.[componentName];
      }
      removeEmptyComponents(openapi, componentType);
    }
  }
}
