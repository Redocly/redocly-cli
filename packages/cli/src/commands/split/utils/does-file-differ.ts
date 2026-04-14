import { dequal } from '@redocly/openapi-core';
import * as fs from 'node:fs';

import { readYaml } from '../../../utils/miscellaneous.js';

export function doesFileDiffer(filename: string, componentData: any) {
  return fs.existsSync(filename) && !dequal(readYaml(filename), componentData);
}
