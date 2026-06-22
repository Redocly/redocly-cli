import {
  escapePointerFragment,
  isAbsoluteUrl,
  slash,
  unescapePointerFragment,
} from '@redocly/openapi-core';
import * as path from 'node:path';

import type { NodeKind } from './types.js';

export const compareStrings = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

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

export function parsePointerSegments(pointer: string): string[] {
  return pointer
    .replace(/^#?\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(unescapePointerFragment);
}

/**
 * Maps a JSON pointer inside the root document to its tree node — the document root, a path, an
 * operation, a component, or a generic top-level group — with a short, file-prefix-free id such as
 * `GET /pets` or `schemas/Pet`.
 */
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

/**
 * Maps a location in another file to its tree node — a component inside that file or the whole file.
 * A component address is `components/{type}/{name}` in OAS 3.x (first 3 segments) or `{section}/{name}`
 * in OAS 2.0 (first 2); anything deeper, like a property, collapses back to that component.
 * Examples: `common.yaml#/components/schemas/Pet` (kept copy-pasteable as a `$ref`), `schemas/pet.yaml`.
 */
export function mapForeignLocation(fileId: string, pointer: string): MappedNode & { file: string } {
  const segments = parsePointerSegments(pointer);

  let componentPath: string[] | undefined;
  if (segments[0] === 'components' && segments.length >= 3) {
    componentPath = segments.slice(0, 3);
  } else if (
    OAS2_COMPONENT_SECTIONS.has(segments[0]) &&
    segments.length >= 2 &&
    // A numeric key is an array index (path-item `parameters`), not a named OAS2 component.
    !/^\d+$/.test(segments[1])
  ) {
    componentPath = segments.slice(0, 2);
  }

  if (componentPath) {
    const canonical = componentPath.map(escapePointerFragment).join('/');
    return { id: `${fileId}#/${canonical}`, kind: 'component', file: fileId };
  }
  return { id: fileId, kind: 'file', file: fileId };
}
