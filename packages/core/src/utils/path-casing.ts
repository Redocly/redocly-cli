import * as fs from 'node:fs';
import * as path from 'node:path';

// macOS and Windows file systems ignore letter case by default, so a path that fails on Linux still opens there.
// Returns an error message when a segment of the path differs from the name on disk only in letter case,
// so the path fails the same way on every operating system.
// The base folder is where the path was written from: the segments above it are not compared.
export function checkPathCasing(
  filePath: string,
  baseFolder: string,
  folderEntries: Map<string, string[]> = new Map()
): string | undefined {
  const baseSegments = path.resolve(baseFolder).split(path.sep);
  const segments = path.resolve(filePath).split(path.sep);

  // The first segment is the root of the file system or the drive.
  let sharedSegmentsCount = 1;
  while (
    sharedSegmentsCount < baseSegments.length &&
    baseSegments[sharedSegmentsCount] === segments[sharedSegmentsCount]
  ) {
    sharedSegmentsCount++;
  }

  let folder = segments.slice(0, sharedSegmentsCount).join(path.sep) + path.sep;
  for (const segment of segments.slice(sharedSegmentsCount)) {
    let names = folderEntries.get(folder);
    if (names === undefined) {
      try {
        names = fs.readdirSync(folder);
      } catch {
        // The folder is missing, or the files don't come from the disk; reading the file reports that.
        names = [];
      }
      folderEntries.set(folder, names);
    }
    if (!names.includes(segment)) {
      const nameOnDisk = names.find((name) => name.toLowerCase() === segment.toLowerCase());
      if (nameOnDisk === undefined) return undefined;
      return `'${filePath}' doesn't match the letter case on disk: use '${nameOnDisk}' instead of '${segment}'.`;
    }
    folder += segment + path.sep;
  }
  return undefined;
}
