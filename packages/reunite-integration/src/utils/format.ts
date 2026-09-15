// Copied from @redocly/cli.
import { isAbsoluteUrl } from '@redocly/openapi-core';
import { relative } from 'node:path';

export function formatPath(path: string) {
  if (isAbsoluteUrl(path)) {
    return path;
  }
  return relative(process.cwd(), path);
}
