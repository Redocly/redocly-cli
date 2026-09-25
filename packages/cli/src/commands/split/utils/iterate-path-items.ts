import {
  slash,
  isRef,
  type Oas3PathItem,
  type OasRef,
  type Referenced,
} from '@redocly/openapi-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  pathToFilename,
  escapeLanguageName,
  langToExt,
  writeToFileByExtension,
} from '../../../utils/miscellaneous.js';
import { OPENAPI3_METHOD_NAMES } from '../oas/constants.js';
import { assertWithinDir } from './assert-within-dir.js';
import { getFileNamePath, type FileNameConflict } from './get-file-name-path.js';
import { traverseDirectoryDeep, traverseDirectoryDeepCallback } from './traverse-directory-deep.js';

export function gatherPathItemFiles(
  pathItems: Record<string, Referenced<Oas3PathItem>> | undefined,
  openapiDir: string,
  outDir: string,
  pathSeparator: string,
  ext: string,
  conflicts: FileNameConflict[]
) {
  const pathItemFiles: Record<string, string> = {};
  const takenFileNames = new Map<string, string>();
  for (const [pathName, pathData] of Object.entries(pathItems || {})) {
    if (isRef(pathData)) continue;
    const pathFile = getFileNamePath(
      outDir,
      pathToFilename(pathName, pathSeparator),
      `.${ext}`,
      takenFileNames,
      conflicts
    );
    assertWithinDir(openapiDir, pathFile, pathName);
    pathItemFiles[pathName] = pathFile;
  }
  return pathItemFiles;
}

export function iteratePathItems(
  pathItems: Record<string, Referenced<Oas3PathItem>> | undefined,
  pathItemFiles: Record<string, string>,
  openapiDir: string,
  outDir: string,
  componentsFiles: object,
  pathSeparator: string,
  codeSamplesPathPrefix: string = ''
) {
  if (!pathItems) return;
  fs.mkdirSync(outDir, { recursive: true });
  const takenSampleFileNames = new Map<string, string>();

  for (const pathName of Object.keys(pathItems)) {
    const pathData = pathItems[pathName];

    if (isRef(pathData)) continue;

    const pathFile = pathItemFiles[pathName];

    for (const method of OPENAPI3_METHOD_NAMES) {
      const methodData = pathData[method];
      const methodDataXCode = methodData?.['x-code-samples'] || methodData?.['x-codeSamples'];
      if (!methodDataXCode || !Array.isArray(methodDataXCode)) {
        continue;
      }
      for (const sample of methodDataXCode) {
        if (sample.source && (sample.source as unknown as OasRef).$ref) continue;
        const sampleFileName = getFileNamePath(
          path.join(
            openapiDir,
            'code_samples',
            escapeLanguageName(sample.lang),
            codeSamplesPathPrefix + pathToFilename(pathName, pathSeparator)
          ),
          method,
          langToExt(sample.lang),
          takenSampleFileNames
        );

        assertWithinDir(openapiDir, sampleFileName, sample.lang);

        fs.mkdirSync(path.dirname(sampleFileName), { recursive: true });
        fs.writeFileSync(sampleFileName, sample.source);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        sample.source = {
          $ref: slash(path.relative(outDir, sampleFileName)),
        };
      }
    }
    writeToFileByExtension(pathData, pathFile);
    pathItems[pathName] = {
      $ref: slash(path.relative(openapiDir, pathFile)),
    };

    traverseDirectoryDeep(outDir, traverseDirectoryDeepCallback, componentsFiles);
  }
}
