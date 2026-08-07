import { COMPONENT_NAME_CHARS } from '../oas-types.js';
import { toPascalCase } from './to-pascal-case.js';

export function componentNameFromTitle(title: string): string {
  return toPascalCase(title).replace(new RegExp(`[^${COMPONENT_NAME_CHARS}]`, 'g'), '-');
}
