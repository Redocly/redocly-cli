import {
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
import { createComponentDir } from './create-component-dir.js';
import { doesFileDiffer } from './does-file-differ.js';
import { extractFileNameFromPath } from './extract-filename-from-path.js';
import { findComponentTypes } from './find-component-type.js';
import { gatherComponentsFiles } from './gather-components-files.js';
import { getFileNamePath } from './get-file-name-path.js';
import { implicitlyReferenceDiscriminator } from './implicitly-reference-discriminator.js';
import { isNotSecurityComponentType } from './is-not-security-component-type.js';
import { removeEmptyComponents } from './remove-empty-components.js';
import { replace$Refs } from './replace-$-refs.js';

export function iterateComponents(
  openapi: AnyOas3Definition,
  openapiDir: string,
  componentsFiles: ComponentsFiles,
  ext: string
) {
  const { components } = openapi;
  if (components) {
    const componentsDir = path.join(openapiDir, COMPONENTS);
    fs.mkdirSync(componentsDir, { recursive: true });
    const componentTypes = findComponentTypes(components);
    componentTypes.forEach(iterateAndGatherComponentsFiles);
    componentTypes.forEach(iterateComponentTypes);

    function iterateAndGatherComponentsFiles(
      componentType: Oas3ComponentName<Oas3Schema | Oas3_1Schema>
    ) {
      const componentDirPath = path.join(componentsDir, componentType);
      for (const componentName of Object.keys(components?.[componentType] || {})) {
        const filename = getFileNamePath(componentDirPath, componentName, ext);
        gatherComponentsFiles(components!, componentsFiles, componentType, componentName, filename);
      }
    }

    function iterateComponentTypes(componentType: Oas3ComponentName<Oas3Schema | Oas3_1Schema>) {
      const componentDirPath = path.join(componentsDir, componentType);
      createComponentDir(componentDirPath, componentType);
      for (const componentName of Object.keys(components?.[componentType] || {})) {
        const filename = getFileNamePath(componentDirPath, componentName, ext);
        const componentData = components?.[componentType]?.[componentName];
        replace$Refs(componentData, path.dirname(filename), componentsFiles);
        implicitlyReferenceDiscriminator(
          componentData,
          extractFileNameFromPath(filename),
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

        if (isNotSecurityComponentType(componentType)) {
          // security schemas must referenced from components
          delete openapi.components?.[componentType]?.[componentName];
        }
      }
      removeEmptyComponents(openapi, componentType);
    }
  }
}
