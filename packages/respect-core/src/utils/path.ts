import { isBrowser } from '@redocly/openapi-core';

let pathPromise: Promise<any> | null = null;

export function getPath() {
  if (!pathPromise) {
    pathPromise = isBrowser
      ? import('path-browserify').then((m) => m.default || m)
      : import('node:path').then((m) => m.default || m);
  }
  return pathPromise;
}
