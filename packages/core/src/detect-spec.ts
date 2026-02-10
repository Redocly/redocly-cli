import { VERSION_PATTERN } from './typings/arazzo.js';
import { isPlainObject } from './utils/is-plain-object.js';

import type { SpecMajorVersion, SpecVersion } from './oas-types';

export const specVersions = [
  'oas2',
  'oas3_0',
  'oas3_1',
  'oas3_2',
  'async2',
  'async3',
  'arazzo1',
  'overlay1',
  'openrpc1',
] as const;

export function getMajorSpecVersion(version: SpecVersion): SpecMajorVersion {
  if (version === 'oas2') {
    return 'oas2';
  } else if (version === 'async2') {
    return 'async2';
  } else if (version === 'async3') {
    return 'async3';
  } else if (version === 'arazzo1') {
    return 'arazzo1';
  } else if (version === 'overlay1') {
    return 'overlay1';
  } else if (version === 'openrpc1') {
    return 'openrpc1';
  } else {
    return 'oas3';
  }
}

export function detectSpec(root: unknown): SpecVersion {
  if (!isPlainObject(root)) {
    throw new Error(`Document must be JSON object, got ${typeof root}`);
  }

  if (typeof root.openrpc === 'string' && root.openrpc.startsWith('1.')) {
    return 'openrpc1';
  }

  if (root.openapi && typeof root.openapi !== 'string') {
    throw new Error(`Invalid OpenAPI version: should be a string but got "${typeof root.openapi}"`);
  }

  if (typeof root.openapi === 'string' && root.openapi.startsWith('3.0.')) {
    return 'oas3_0';
  }

  if (typeof root.openapi === 'string' && root.openapi.startsWith('3.1.')) {
    return 'oas3_1';
  }

  if (typeof root.openapi === 'string' && root.openapi.startsWith('3.2.')) {
    return 'oas3_2';
  }

  if (root.swagger && root.swagger === '2.0') {
    return 'oas2';
  }

  if (root.openapi || root.swagger) {
    throw new Error(`Unsupported OpenAPI version: ${root.openapi || root.swagger}`);
  }

  if (typeof root.asyncapi === 'string' && root.asyncapi.startsWith('2.')) {
    return 'async2';
  }

  if (typeof root.asyncapi === 'string' && root.asyncapi.startsWith('3.')) {
    return 'async3';
  }

  if (root.asyncapi) {
    throw new Error(`Unsupported AsyncAPI version: ${root.asyncapi}`);
  }

  if (typeof root.arazzo === 'string' && VERSION_PATTERN.test(root.arazzo)) {
    return 'arazzo1';
  }

  if (typeof root.overlay === 'string' && VERSION_PATTERN.test(root.overlay)) {
    return 'overlay1';
  }

  throw new Error(`Unsupported specification`);
}
