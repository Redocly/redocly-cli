import { Source } from './resolve';
import { OASRef } from './typings/openapi';

export function joinPointer(base: string, key: string | number) {
  return base[base.length - 1] === '/' ? base + key : base + '/' + key;
}

export function isRef(node: any): node is OASRef {
  return node && typeof node.$ref === 'string';
}

export class Location {
  constructor(public source: Source, public pointer: string) {}

  append(components: (string | number)[] | string | number) {
    return new Location(
      this.source,
      joinPointer(
        this.pointer,
        (Array.isArray(components) ? components : [components]).map(escapePointer).join('/'),
      ),
    );
  }

  get absolutePointer() {
    return this.source.absoluteRef + this.pointer;
  }
}

export function unescapePointer(fragment: string): string {
  return fragment.replace(/~1/g, '/').replace(/~0/g, '~');
}

export function escapePointer<T extends string | number>(fragment: T): T {
  if (typeof fragment === 'number') return fragment;
  return (fragment as string).replace(/~/g, '~0').replace(/\//g, '~1') as T;
}

export function parseRef(ref: string): { uri: string | null; pointer: string } {
  const [uri, pointer] = ref.split('#/');
  return {
    uri: uri || null,
    pointer: '#/' + (pointer || ''),
  };
}

export function parsePointer(pointer: string) {
  return pointer.substr(2).split('/').map(unescapePointer);
}

export function pointerBaseName(pointer: string) {
  const parts = pointer.split('/');
  return parts[parts.length - 1];
}

export function refBaseName(ref: string) {
  const parts = ref.split('/');
  return parts[parts.length - 1].split('.')[0];
}
