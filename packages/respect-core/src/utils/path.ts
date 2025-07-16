import { isBrowser } from '@redocly/openapi-core';

let pathLib: any;

if (isBrowser) {
  // Browser environment
  pathLib = await import('path-browserify');
} else {
  // Node.js environment
  pathLib = await import('node:path');
}

export default pathLib;
