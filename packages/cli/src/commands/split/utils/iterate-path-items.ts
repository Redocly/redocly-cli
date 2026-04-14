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
import { traverseDirectoryDeep, traverseDirectoryDeepCallback } from './traverse-directory-deep.js';

export function iteratePathItems(
  pathItems: Record<string, Referenced<Oas3PathItem>> | undefined,
  openapiDir: string,
  outDir: string,
  componentsFiles: object,
  pathSeparator: string,
  codeSamplesPathPrefix: string = '',
  ext: string
) {
  if (!pathItems) return;
  fs.mkdirSync(outDir, { recursive: true });

  for (const pathName of Object.keys(pathItems)) {
    const pathFile = `${path.join(outDir, pathToFilename(pathName, pathSeparator))}.${ext}`;
    const pathData = pathItems[pathName];

    if (isRef(pathData)) continue;

    for (const method of OPENAPI3_METHOD_NAMES) {
      const methodData = pathData[method];
      const methodDataXCode = methodData?.['x-code-samples'] || methodData?.['x-codeSamples'];
      if (!methodDataXCode || !Array.isArray(methodDataXCode)) {
        continue;
      }
      for (const sample of methodDataXCode) {
        if (sample.source && (sample.source as unknown as OasRef).$ref) continue;
        const sampleFileName = path.join(
          openapiDir,
          'code_samples',
          escapeLanguageName(sample.lang),
          codeSamplesPathPrefix + pathToFilename(pathName, pathSeparator),
          method + langToExt(sample.lang)
        );

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
