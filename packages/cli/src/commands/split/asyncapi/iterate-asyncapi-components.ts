import { logger } from '@redocly/openapi-core';
import { blue } from 'colorette';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { writeToFileByExtension } from '../../../utils/miscellaneous.js';
import { COMPONENTS } from '../constants.js';
import {
  type ChannelsFiles,
  type ComponentsFiles,
  type AnyAsyncApiDefinition,
  type AsyncApi2SplittableComponent,
  type AsyncApi3SplittableComponent,
} from '../types.js';
import { createComponentDir } from '../utils/create-component-dir.js';
import { doesFileDiffer } from '../utils/does-file-differ.js';
import { getFileNamePath } from '../utils/get-file-name-path.js';
import { replace$Refs } from '../utils/replace-$-refs.js';
import { replaceChannelRefs } from '../utils/replace-channel-refs.js';
import { findAsyncApiComponentTypes } from './find-asyncapi-component-types.js';
import { removeAsyncApiEmptyComponents } from './remove-asyncapi-empty-components.js';

export function iterateAsyncApiComponents({
  asyncapi,
  asyncapiDir,
  componentsFiles,
  channelsFiles,
  ext,
  specVersion,
}: {
  asyncapi: AnyAsyncApiDefinition;
  asyncapiDir: string;
  componentsFiles: ComponentsFiles;
  channelsFiles: ChannelsFiles;
  ext: string;
  specVersion: 'async2' | 'async3';
}) {
  const { components } = asyncapi;
  if (components) {
    const componentsDir = path.join(asyncapiDir, COMPONENTS);
    fs.mkdirSync(componentsDir, { recursive: true });
    const componentTypes = findAsyncApiComponentTypes(components, specVersion);
    componentTypes.forEach(iterateComponentTypes);

    function iterateComponentTypes(
      componentType: AsyncApi2SplittableComponent | AsyncApi3SplittableComponent
    ) {
      const componentDirPath = path.join(componentsDir, componentType);
      createComponentDir(componentDirPath, componentType);
      for (const componentName of Object.keys(components?.[componentType] || {})) {
        const filename = getFileNamePath(componentDirPath, componentName, ext);
        const componentData = components?.[componentType]?.[componentName];
        replace$Refs(componentData, path.dirname(filename), componentsFiles);
        replaceChannelRefs(componentData, path.dirname(filename), channelsFiles);

        if (doesFileDiffer(filename, componentData)) {
          logger.warn(
            `warning: conflict for ${componentName} - file already exists with different content: ${blue(
              filename
            )} ... Skip.\n`
          );
        } else {
          writeToFileByExtension(componentData, filename);
        }

        delete asyncapi.components?.[componentType]?.[componentName];
      }
      removeAsyncApiEmptyComponents(asyncapi, componentType);
    }
  }
}
