import { readFileSync } from 'fs';
import { join as pathJoin, resolve as pathResolve } from 'path';
import { lintDocument } from '../../lint';
import { LintConfig } from '../../config/config';
import { BaseResolver } from '../../resolve';
import { parseYamlToDocument } from '../utils';
import { defaultPlugin } from '../../config/builtIn';

export const name = 'Validate with recommended rules';
export const count = 10;
const rebillyDefinitionRef = pathResolve(pathJoin(__dirname, 'rebilly.yaml'));
const rebillyDocument = parseYamlToDocument(
  readFileSync(rebillyDefinitionRef, 'utf-8'),
  rebillyDefinitionRef,
);

export function measureAsync() {
  return lintDocument({
    externalRefResolver: new BaseResolver(),
    document: rebillyDocument,
    config: new LintConfig({ plugins: [defaultPlugin] }),
  });
}
