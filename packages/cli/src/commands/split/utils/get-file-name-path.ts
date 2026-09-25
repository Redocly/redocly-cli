import * as path from 'node:path';

export type FileNameConflict = { name: string; collidingName: string; filename: string };

// Names that differ only by case would share one file on a case-insensitive file system,
// and equal names would overwrite each other, so every later name gets a `-2`, `-3`, … suffix.
export function getFileNamePath(
  dirPath: string,
  name: string,
  extension: string,
  takenFileNames: Map<string, string>,
  conflicts?: FileNameConflict[]
) {
  const basePath = path.join(dirPath, name);
  let filename = basePath + extension;
  const collidingName = takenFileNames.get(filename.toLowerCase());
  for (let serialId = 2; takenFileNames.has(filename.toLowerCase()); serialId++) {
    filename = `${basePath}-${serialId}${extension}`;
  }
  if (collidingName && collidingName !== name) {
    conflicts?.push({ name, collidingName, filename });
  }
  takenFileNames.set(filename.toLowerCase(), name);
  return filename;
}
