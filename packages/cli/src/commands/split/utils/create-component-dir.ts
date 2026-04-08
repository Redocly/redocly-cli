import * as fs from 'node:fs';

import { isNotSecurityComponentType } from './is-not-security-component-type.js';

export function createComponentDir(componentDirPath: string, componentType: string) {
  if (isNotSecurityComponentType(componentType)) {
    fs.mkdirSync(componentDirPath, { recursive: true });
  }
}
