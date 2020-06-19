import { readFileSync } from 'fs';
import { join as pathJoin, resolve as pathResolve } from 'path';

import { validateDocument } from '../../src/validate';
import { parseYamlToDocument } from '../../src/__tests__/utils';

import { LintConfig } from '../../src/config/config';

export const name = 'Validate with recommended rules';
export const count = 10;

const rebillyDefinitionRef = pathResolve(pathJoin(__dirname, 'rebilly.yaml'));
const rebillyDocument = parseYamlToDocument(
  readFileSync(rebillyDefinitionRef, 'utf-8'),
  rebillyDefinitionRef,
);

export function measureAsync() {
  return validateDocument({
    document: rebillyDocument,
    config: new LintConfig({}),
  });
}
