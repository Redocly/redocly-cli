import {
  escapePointerFragment,
  isAbsoluteUrl,
  slash,
  unescapePointerFragment,
} from '@redocly/openapi-core';
import * as path from 'node:path';

import type { NodeKind } from './types.js';

/** Codepoint comparison (not localeCompare): deterministic across Node ICU builds → stable output. */
export const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Converts an absolute file path or URL into a stable node id (cwd-relative posix path; URLs as-is). */
export function toNodeId(absoluteRef: string, cwd: string): string {
  return isAbsoluteUrl(absoluteRef) ? absoluteRef : slash(path.relative(cwd, absoluteRef));
}

export const OPERATION_METHODS = new Set([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
  'query',
  'x-query',
]);

const OAS2_COMPONENT_SECTIONS = new Set([
  'definitions',
  'parameters',
  'responses',
  'securityDefinitions',
]);

export type MappedNode = {
  id: string;
  kind: NodeKind;
  /** Ancestor ids for structural spine edges, outermost first ([] = link directly to root; undefined = no structural link). */
  ancestry?: string[];
};

/** Splits a JSON pointer like '#/paths/~1pets/get' into unescaped segments: ['paths', '/pets', 'get']. */
export function parsePointerSegments(pointer: string): string[] {
  return pointer
    .replace(/^#?\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(unescapePointerFragment);
}

/** Maps a pointer within the root document to the tree node that owns it. */
export function mapRootPointer(pointer: string, rootId: string): MappedNode {
  const segments = parsePointerSegments(pointer);
  if (segments.length === 0) {
    return { id: rootId, kind: 'root' };
  }
  const [head, second, third] = segments;
  if (head === 'paths' && second !== undefined) {
    if (third !== undefined && OPERATION_METHODS.has(third)) {
      return { id: `${third.toUpperCase()} ${second}`, kind: 'operation', ancestry: [second] };
    }
    return { id: second, kind: 'path', ancestry: [] };
  }
  if (head === 'components' && second !== undefined && third !== undefined) {
    return { id: `${second}/${third}`, kind: 'component' };
  }
  if (OAS2_COMPONENT_SECTIONS.has(head) && second !== undefined) {
    return { id: `${head}/${second}`, kind: 'component' };
  }
  return {
    id: second !== undefined ? `${head}/${second}` : head,
    kind: 'component',
    ancestry: [],
  };
}

/** Maps a location in a non-root file to a component inside it or to the whole file. */
export function mapForeignLocation(fileId: string, pointer: string): MappedNode & { file: string } {
  const segments = parsePointerSegments(pointer);
  const componentDepth =
    segments[0] === 'components' ? 3 : OAS2_COMPONENT_SECTIONS.has(segments[0]) ? 2 : 0;
  if (componentDepth > 0 && segments.length >= componentDepth) {
    const canonical = segments.slice(0, componentDepth).map(escapePointerFragment).join('/');
    return { id: `${fileId}#/${canonical}`, kind: 'component', file: fileId };
  }
  return { id: fileId, kind: 'file', file: fileId };
}
