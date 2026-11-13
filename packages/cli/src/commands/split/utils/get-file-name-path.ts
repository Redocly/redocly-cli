import * as path from 'node:path';

export type FileNameConflict = {
  name: string;
  collidingName: string;
  filename: string;
  pointer: string;
};

// Names that differ only by case would share one file on a case-insensitive file system,
// and equal names would overwrite each other, so every later name gets a `-2`, `-3`, … suffix.
export function getFileNamePath(
  dirPath: string,
  name: string,
  ext: string,
  takenFileNames: Map<string, string>,
  conflictReport?: { conflicts: FileNameConflict[]; pointer: string }
) {
  const extension = ext ? `.${ext}` : '';
  const basePath = path.join(dirPath, name);
  let filename = basePath + extension;
  const collidingName = takenFileNames.get(filename.toLowerCase());
  for (let serialId = 2; takenFileNames.has(filename.toLowerCase()); serialId++) {
    filename = `${basePath}-${serialId}${extension}`;
  }
  if (
    conflictReport &&
    collidingName &&
    collidingName !== name &&
    collidingName.toLowerCase() === name.toLowerCase()
  ) {
    conflictReport.conflicts.push({
      name,
      collidingName,
      filename,
      pointer: conflictReport.pointer,
    });
  }
  takenFileNames.set(filename.toLowerCase(), name);
  return filename;
}
