import { readFileSync } from 'fs';
import { join as pathJoin, resolve as pathResolve } from 'path';

import { validateDocument } from '../../src/validate';
import { parseYamlToDocument, makeConfigForRuleset } from '../../src/__tests__/utils';

export const name = 'Validate with 50 top-level rules';
export const count = 10;

const rebillyDefinitionRef = pathResolve(pathJoin(__dirname, 'rebilly.yaml'));
const rebillyDocument = parseYamlToDocument(
  readFileSync(rebillyDefinitionRef, 'utf-8'),
  rebillyDefinitionRef,
);

const ruleset: any = {};
for (let i = 0; i < 50; i++) {
  ruleset['rule-' + i] = () => {
    let count = 0;
    return {
      Schema() {
        count++;
      },
    };
  };
}

const config = makeConfigForRuleset(ruleset);

export function measureAsync() {
  return validateDocument({
    document: rebillyDocument,
    config,
  });
}
