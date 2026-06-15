import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_TEMPLATE_SOURCE } from '../utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('build-docs utils', () => {
  it('DEFAULT_TEMPLATE_SOURCE matches template.hbs on disk', () => {
    const templatePath = path.resolve(__dirname, '../template.hbs');
    const fileContent = readFileSync(templatePath, 'utf-8');
    expect(DEFAULT_TEMPLATE_SOURCE).toBe(fileContent);
  });
});
