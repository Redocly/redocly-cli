import {
  type Oas3_1Definition,
  type Oas3_2Definition,
  type Oas3Definition,
} from '@redocly/openapi-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { writeToFileByExtension } from '../../../utils/miscellaneous.js';
import type { AnyOas3Definition, ComponentsFiles } from '../types.js';
import { iterateComponents } from '../utils/iterate-components.js';
import { iteratePathItems } from '../utils/iterate-path-items.js';
import { replace$Refs } from '../utils/replace-$-refs.js';

export function splitOASDefinition(
  openapi: AnyOas3Definition,
  openapiDir: string,
  pathSeparator: string,
  ext: string
) {
  fs.mkdirSync(openapiDir, { recursive: true });

  const componentsFiles: ComponentsFiles = {};
  iterateComponents(openapi, openapiDir, componentsFiles, ext);
  iteratePathItems(
    openapi.paths,
    openapiDir,
    path.join(openapiDir, 'paths'),
    componentsFiles,
    pathSeparator,
    undefined,
    ext
  );
  const webhooks =
    (openapi as Oas3_1Definition | Oas3_2Definition).webhooks ||
    (openapi as Oas3Definition)['x-webhooks'];
  // use webhook_ prefix for code samples to prevent potential name-clashes with paths samples
  iteratePathItems(
    webhooks,
    openapiDir,
    path.join(openapiDir, 'webhooks'),
    componentsFiles,
    pathSeparator,
    'webhook_',
    ext
  );

  replace$Refs(openapi, openapiDir, componentsFiles);
  writeToFileByExtension(openapi, path.join(openapiDir, `openapi.${ext}`));
}
