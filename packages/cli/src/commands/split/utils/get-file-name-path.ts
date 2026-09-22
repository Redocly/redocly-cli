import { logger } from '@redocly/openapi-core';
import { blue } from 'colorette';
import * as path from 'node:path';

export function getFileNamePath(componentDirPath: string, componentName: string, ext: string) {
  return path.join(componentDirPath, componentName) + `.${ext}`;
}

// Component names that differ only by case would share one file on a case-insensitive file system.
export function getUniqueFileNamePath(
  componentDirPath: string,
  componentName: string,
  ext: string,
  takenFileNames: Map<string, string>
) {
  let filename = getFileNamePath(componentDirPath, componentName, ext);
  const collidingName = takenFileNames.get(filename.toLowerCase());
  for (let serialId = 2; takenFileNames.has(filename.toLowerCase()); serialId++) {
    filename = getFileNamePath(componentDirPath, `${componentName}-${serialId}`, ext);
  }
  if (collidingName) {
    logger.warn(
      `warning: ${componentName} and ${collidingName} would share one file on a case-insensitive file system, saving ${componentName} to ${blue(
        filename
      )}.\n`
    );
  }
  takenFileNames.set(filename.toLowerCase(), componentName);
  return filename;
}
