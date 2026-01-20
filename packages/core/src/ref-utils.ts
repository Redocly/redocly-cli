import * as path from 'node:path';
import { isTruthy } from './utils/is-truthy.js';
import { isPlainObject } from './utils/is-plain-object.js';

import type { ResolveResult, UserContext } from './walk.js';
import type { Source } from './resolve.js';
import type { OasRef } from './typings/openapi.js';

export function joinPointer(base: string, key: string | number) {
  if (base === '') base = '#/';
  return base[base.length - 1] === '/' ? base + key : base + '/' + key;
}

export function isRef(node: unknown): node is OasRef {
  return isPlainObject(node) && typeof node.$ref === 'string';
}

export function isExternalValue(node: unknown) {
  return isPlainObject(node) && typeof node.externalValue === 'string';
}

export class Location {
  constructor(public source: Source, public pointer: string) {}

  child(components: (string | number)[] | string | number) {
    return new Location(
      this.source,
      joinPointer(
        this.pointer,
        (Array.isArray(components) ? components : [components]).map(escapePointerFragment).join('/')
      )
    );
  }

  key() {
    return { ...this, reportOnKey: true };
  }

  get absolutePointer() {
    return this.source.absoluteRef + (this.pointer === '#/' ? '' : this.pointer);
  }
}

export function unescapePointerFragment(fragment: string): string {
  const unescaped =
    fragment.indexOf('~') === -1 ? fragment : fragment.replaceAll('~1', '/').replaceAll('~0', '~');

  try {
    return decodeURIComponent(unescaped);
  } catch (e) {
    return unescaped;
  }
}

export function escapePointerFragment<T extends string | number>(fragment: T): T {
  if (typeof fragment === 'number') return fragment;
  if (fragment.indexOf('/') === -1 && fragment.indexOf('~') === -1) return fragment;

  return fragment.replaceAll('~', '~0').replaceAll('/', '~1') as T;
}

export function parseRef(ref: string): { uri: string | null; pointer: string[] } {
  const [uri, pointer = ''] = ref.split('#/');
  return {
    uri: (uri.endsWith('#') ? uri.slice(0, -1) : uri) || null,
    pointer: parsePointer(pointer),
  };
}

export function parsePointer(pointer: string) {
  return pointer.split('/').map(unescapePointerFragment).filter(isTruthy);
}

export function pointerBaseName(pointer: string) {
  const parts = pointer.split('/');
  return parts[parts.length - 1];
}

export function refBaseName(ref: string) {
  // eslint-disable-next-line no-useless-escape
  const parts = ref.split(/[\/\\]/); // split by '\' and '/'
  return parts[parts.length - 1].replace(/\.[^.]+$/, ''); // replace extension with empty string
}

export function isAbsoluteUrl(ref: string) {
  return ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('file://');
}

export function getDir(filePath: string): string {
  if (!path.extname(filePath)) {
    return filePath;
  }

  return isAbsoluteUrl(filePath)
    ? filePath.substring(0, filePath.lastIndexOf('/'))
    : path.dirname(filePath);
}

export function resolvePath(base: string, relative: string): string {
  if (isAbsoluteUrl(base)) {
    return new URL(relative, base.endsWith('/') ? base : `${base}/`).href;
  }
  return path.resolve(base, relative);
}

export function isMappingRef(mapping: string) {
  // TODO: proper detection of mapping refs
  return (
    mapping.startsWith('#') ||
    mapping.startsWith('https://') ||
    mapping.startsWith('http://') ||
    mapping.startsWith('./') ||
    mapping.startsWith('../') ||
    mapping.indexOf('/') > -1
  );
}

export function isAnchor(ref: string) {
  return /^#[A-Za-z][A-Za-z0-9\-_:.]*$/.test(ref);
}

export function replaceRef(ref: OasRef, resolved: ResolveResult<any>, ctx: UserContext) {
  if (!isPlainObject(resolved.node)) {
    ctx.parent[ctx.key] = resolved.node;
  } else {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete ref.$ref;
    const obj = Object.assign({}, resolved.node, ref);
    Object.assign(ref, obj); // assign ref itself again so ref fields take precedence
  }
}
