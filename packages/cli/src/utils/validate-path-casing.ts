import { checkPathCasing, HandledError } from '@redocly/openapi-core';

// Fails for a path that opens on macOS and Windows but not on Linux, where file names are case-sensitive.
export function validatePathCasing(filePath: string): string {
  const casingError = checkPathCasing(filePath, process.cwd());
  if (casingError !== undefined) {
    throw new HandledError(casingError);
  }
  return filePath;
}
