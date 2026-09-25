import {
  type Oas3_1Definition,
  type Oas3_2Definition,
  type Oas3Definition,
  type RuleSeverity,
} from '@redocly/openapi-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { writeToFileByExtension } from '../../../utils/miscellaneous.js';
import type { AnyOas3Definition, ComponentsFiles } from '../types.js';
import type { FileNameConflict } from '../utils/get-file-name-path.js';
import { gatherOasComponentFiles, iterateComponents } from '../utils/iterate-components.js';
import { gatherPathItemFiles, iteratePathItems } from '../utils/iterate-path-items.js';
import { replace$Refs } from '../utils/replace-$-refs.js';
import { reportFileNameConflicts } from '../utils/report-file-name-conflicts.js';

export function splitOASDefinition(
  openapi: AnyOas3Definition,
  openapiDir: string,
  pathSeparator: string,
  ext: string,
  fileNameConflictsSeverity?: RuleSeverity
) {
  const pathsDir = path.join(openapiDir, 'paths');
  const webhooksDir = path.join(openapiDir, 'webhooks');
  const webhooks =
    (openapi as Oas3_1Definition | Oas3_2Definition).webhooks ||
    (openapi as Oas3Definition)['x-webhooks'];

  // every file name is chosen before anything is written, so a conflict reported as an error leaves no files behind
  const componentsFiles: ComponentsFiles = {};
  const conflicts: FileNameConflict[] = [];
  gatherOasComponentFiles(openapi, openapiDir, componentsFiles, ext, conflicts);
  const pathItemFiles = gatherPathItemFiles(
    openapi.paths,
    openapiDir,
    pathsDir,
    pathSeparator,
    ext,
    conflicts
  );
  const webhookFiles = gatherPathItemFiles(
    webhooks,
    openapiDir,
    webhooksDir,
    pathSeparator,
    ext,
    conflicts
  );
  reportFileNameConflicts(conflicts, fileNameConflictsSeverity);

  fs.mkdirSync(openapiDir, { recursive: true });
  iterateComponents(openapi, openapiDir, componentsFiles);
  iteratePathItems(
    openapi.paths,
    pathItemFiles,
    openapiDir,
    pathsDir,
    componentsFiles,
    pathSeparator
  );
  // use webhook_ prefix for code samples to prevent potential name-clashes with paths samples
  iteratePathItems(
    webhooks,
    webhookFiles,
    openapiDir,
    webhooksDir,
    componentsFiles,
    pathSeparator,
    'webhook_'
  );

  replace$Refs(openapi, openapiDir, componentsFiles);
  writeToFileByExtension(openapi, path.join(openapiDir, `openapi.${ext}`));
}
