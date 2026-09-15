import { isAbsoluteUrl } from '@redocly/openapi-core';
import { relative } from 'node:path';

export function formatPath(path: string) {
  if (isAbsoluteUrl(path)) {
    return path;
  }
  return relative(process.cwd(), path);
}

export function capitalize(s: string) {
  if (s?.length > 0) {
    return s[0].toUpperCase() + s.slice(1);
  }
  return s;
}
