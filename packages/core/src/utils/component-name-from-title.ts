import { COMPONENT_NAME_CHARS } from '../oas-types.js';
import { isPlainObject } from './is-plain-object.js';
import { isString } from './is-string.js';
import { toPascalCase } from './to-pascal-case.js';

export function componentNameFromTitle(node: unknown): { title: string; name: string } {
  const title = isPlainObject(node) && isString(node.title) ? node.title.trim() : '';
  const name = toPascalCase(title).replace(new RegExp(`[^${COMPONENT_NAME_CHARS}]`, 'g'), '-');
  return { title, name };
}
