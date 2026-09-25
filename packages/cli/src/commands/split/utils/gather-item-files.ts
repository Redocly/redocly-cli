import { isRef } from '@redocly/openapi-core';

import { pathToFilename } from '../../../utils/miscellaneous.js';
import { assertWithinDir } from './assert-within-dir.js';
import { getFileNamePath, type FileNameConflict } from './get-file-name-path.js';

export function gatherItemFiles(
  items: Record<string, unknown> | undefined,
  baseDir: string,
  outDir: string,
  pathSeparator: string,
  ext: string,
  conflicts: FileNameConflict[]
) {
  const itemFiles: Record<string, string> = {};
  const takenFileNames = new Map<string, string>();
  for (const [itemName, item] of Object.entries(items || {})) {
    if (isRef(item)) continue;
    const itemFile = getFileNamePath(
      outDir,
      pathToFilename(itemName, pathSeparator),
      `.${ext}`,
      takenFileNames,
      conflicts
    );
    assertWithinDir(baseDir, itemFile, itemName);
    itemFiles[itemName] = itemFile;
  }
  return itemFiles;
}
