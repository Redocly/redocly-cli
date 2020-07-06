import { readFileSync } from 'fs';
import { join as pathJoin, resolve as pathResolve } from 'path';

import { validateDocument } from '../../src/validate';
import { parseYamlToDocument, makeConfigForRuleset } from '../../src/__tests__/utils';
import { BaseResolver } from '../../src/resolve';

export const name = 'Validate with single top-level rule';
export const count = 10;

const rebillyDefinitionRef = pathResolve(pathJoin(__dirname, 'rebilly.yaml'));
const rebillyDocument = parseYamlToDocument(
  readFileSync(rebillyDefinitionRef, 'utf-8'),
  rebillyDefinitionRef,
);

const config = makeConfigForRuleset({
  test: () => {
    let count = 0;
    return {
      Schema() {
        count++;
        if (count === -1) throw new Error('Disable optimization');
      },
    };
  },
});

export function measureAsync() {
  return validateDocument({
    externalRefResolver: new BaseResolver(),
    document: rebillyDocument,
    config,
  });
}
