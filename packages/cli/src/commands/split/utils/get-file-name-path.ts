import { logger } from '@redocly/openapi-core';
import { blue } from 'colorette';
import * as path from 'node:path';

// Names that differ only by case would share one file on a case-insensitive file system,
// and equal names would overwrite each other, so every later name gets a `-2`, `-3`, … suffix.
export function getFileNamePath(
  dirPath: string,
  name: string,
  extension: string,
  takenFileNames: Map<string, string>
) {
  const basePath = path.join(dirPath, name);
  let filename = basePath + extension;
  const collidingName = takenFileNames.get(filename.toLowerCase());
  for (let serialId = 2; takenFileNames.has(filename.toLowerCase()); serialId++) {
    filename = `${basePath}-${serialId}${extension}`;
  }
  if (collidingName && collidingName !== name) {
    logger.warn(
      `warning: ${name} and ${collidingName} would share one file on a case-insensitive file system, saving ${name} to ${blue(
        filename
      )}.\n`
    );
  }
  takenFileNames.set(filename.toLowerCase(), name);
  return filename;
}
