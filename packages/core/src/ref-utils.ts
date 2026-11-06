import * as path from 'node:path';

import type { Source } from './resolve.js';
import type { Oas3Example, OasRef } from './typings/openapi.js';
import { isPlainObject } from './utils/is-plain-object.js';
import { isTruthy } from './utils/is-truthy.js';
import type { ResolveResult, UserContext } from './walk.js';

export function joinPointer(base: string, key: string | number) {
  if (base === '') base = '#/';
  return base[base.length - 1] === '/' ? base + key : base + '/' + key;
}

export function isRef(node: unknown): node is OasRef {
  return isPlainObject(node) && typeof node.$ref === 'string';
}

export function isRefWithSiblings(node: unknown): node is OasRef & Record<string, unknown> {
  return isRef(node) && Object.keys(node).length > 1;
}

export function isExternalValue(node: unknown): node is Oas3Example & { externalValue: string } {
  return isPlainObject(node) && typeof node.externalValue === 'string';
}

export class Location {
  constructor(
    public source: Source,
    public pointer: string
  ) {}

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
    // Preserving absolute pointer for getter
    return Object.assign(Object.create(Location.prototype), this, { reportOnKey: true });
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

export function isFileUrl(ref: string) {
  return ref.startsWith('file://');
}

export function isAbsoluteUrl(ref: string) {
  return (
    ref.startsWith('http://') ||
    ref.startsWith('https://') ||
    isFileUrl(ref) ||
    ref.startsWith('data:')
  );
}

export function getSchemaId(node: unknown): string | undefined {
  if (
    isPlainObject(node) &&
    typeof node.$id === 'string' &&
    node.$id.length > 0 &&
    !node.$id.startsWith('#')
  ) {
    return node.$id;
  }
  return undefined;
}

export function isSchemeUri(uri: string): boolean {
  // Matches RFC 3986 scheme (e.g. urn:, tag:, http:, https:) while excluding Windows drive letters (C:\ or C:/)
  return /^[a-zA-Z][a-zA-Z0-9+.-]+:/.test(uri);
}

export function resolveSchemaId(baseUri: string, schemaId: string): string {
  const [normalizedId] = schemaId.split('#');
  if (!normalizedId) {
    return baseUri;
  }

  if (isAbsoluteUrl(normalizedId)) {
    return normalizedId;
  }

  if (isSchemeUri(normalizedId)) {
    return normalizedId;
  }

  if (baseUri && (isAbsoluteUrl(baseUri) || isSchemeUri(baseUri))) {
    try {
      return new URL(normalizedId, baseUri).href.split('#')[0];
    } catch {
      return normalizedId;
    }
  }

  return path.resolve(baseUri ? path.dirname(baseUri) : process.cwd(), normalizedId);
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
    typeof mapping === 'string' &&
    (mapping.startsWith('#') ||
      isAbsoluteUrl(mapping) ||
      mapping.startsWith('./') ||
      mapping.startsWith('../') ||
      mapping.indexOf('/') > -1 ||
      /\.(ya?ml|json)$/i.test(mapping))
  );
}

export function isAnchor(ref: string) {
  return /^#[A-Za-z][A-Za-z0-9\-_:.]*$/.test(ref);
}

export function replaceRef(ref: OasRef, resolved: ResolveResult<any>, ctx: UserContext) {
  if (!isPlainObject(resolved.node) && ctx.parent) {
    ctx.parent[ctx.key] = resolved.node;
    return;
  }

  delete (ref as Partial<OasRef>).$ref;

  if (isPlainObject(resolved.node)) {
    Object.assign(ref, { ...resolved.node, ...ref }); // ref fields take precedence
  }
}
