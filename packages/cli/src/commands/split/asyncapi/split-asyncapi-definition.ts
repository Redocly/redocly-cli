import { type Async3Definition, type RuleSeverity } from '@redocly/openapi-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { writeToFileByExtension } from '../../../utils/miscellaneous.js';
import { CHANNELS, OPERATIONS } from '../constants.js';
import { type ComponentsFiles, type AnyAsyncApiDefinition } from '../types.js';
import { gatherItemFiles } from '../utils/gather-item-files.js';
import type { FileNameConflict } from '../utils/get-file-name-path.js';
import { replace$Refs } from '../utils/replace-$-refs.js';
import { reportFileNameConflicts } from '../utils/report-file-name-conflicts.js';
import { gatherAsyncApiComponentFiles } from './gather-asyncapi-component-files.js';
import { iterateAsyncApiChannels } from './iterate-asyncapi-channels.js';
import { iterateAsyncApiComponents } from './iterate-asyncapi-components.js';
import { iterateAsyncApiOperations } from './iterate-asyncapi-operations.js';

export function splitAsyncApiDefinition({
  asyncapi,
  asyncapiDir,
  pathSeparator,
  ext,
  specVersion,
  fileNameConflictsSeverity,
}: {
  asyncapi: AnyAsyncApiDefinition;
  asyncapiDir: string;
  pathSeparator: string;
  ext: string;
  specVersion: 'async2' | 'async3';
  fileNameConflictsSeverity?: RuleSeverity;
}) {
  const channelsDir = path.join(asyncapiDir, CHANNELS);
  const operationsDir = path.join(asyncapiDir, OPERATIONS);
  const operations =
    specVersion === 'async3' ? (asyncapi as Async3Definition).operations : undefined;

  // Phase 1: choose every file name before anything is written, so replace$Refs can resolve
  // #/components/... when writing channels and a conflict reported as an error leaves no files behind
  const componentsFiles: ComponentsFiles = {};
  const conflicts: FileNameConflict[] = [];
  gatherAsyncApiComponentFiles({
    asyncapi,
    asyncapiDir,
    componentsFiles,
    ext,
    specVersion,
    conflicts,
  });
  const channelsFiles = gatherItemFiles(
    asyncapi.channels,
    asyncapiDir,
    channelsDir,
    pathSeparator,
    ext,
    conflicts
  );
  const operationFiles = gatherItemFiles(
    operations,
    asyncapiDir,
    operationsDir,
    pathSeparator,
    ext,
    conflicts
  );
  reportFileNameConflicts(conflicts, fileNameConflictsSeverity);

  fs.mkdirSync(asyncapiDir, { recursive: true });

  // Phase 2: split channels (componentsFiles is populated → replace$Refs rewrites #/components/... refs)
  iterateAsyncApiChannels({
    channels: asyncapi.channels,
    channelsFiles,
    asyncapiDir,
    outDir: channelsDir,
    componentsFiles,
  });

  // Phase 3: write component files (channelsFiles is populated → replaceChannelRefs rewrites #/channels/... refs)
  iterateAsyncApiComponents({
    asyncapi,
    asyncapiDir,
    componentsFiles,
    channelsFiles,
    specVersion,
  });

  // Phase 4: split operations for AsyncAPI 3
  iterateAsyncApiOperations({
    operations,
    operationFiles,
    asyncapiDir,
    outDir: operationsDir,
    componentsFiles,
    channelsFiles,
  });

  replace$Refs(asyncapi, asyncapiDir, componentsFiles);
  writeToFileByExtension(asyncapi, path.join(asyncapiDir, `asyncapi.${ext}`));
}
