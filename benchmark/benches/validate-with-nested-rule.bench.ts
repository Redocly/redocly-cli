import { readFileSync } from 'fs';
import { join as pathJoin, resolve as pathResolve } from 'path';

import { validateDocument } from '../../src/validate';
import { parseYamlToDocument, makeConfigForRuleset } from '../../src/__tests__/utils';

export const name = 'Validate with single nested rule';
export const count = 10;

const rebillyDefinitionRef = pathResolve(pathJoin(__dirname, 'rebilly.yaml'));
const rebillyDocument = parseYamlToDocument(
  readFileSync(rebillyDefinitionRef, 'utf-8'),
  rebillyDefinitionRef,
);

const visitor = {
  test: () => {
    let count = 0;
    return {
      PathItem: {
        Parameter() {
          count++;
        },
        Operation: {
          Parameter() {
            count++;
          },
        },
      },
    };
  },
};

const config = makeConfigForRuleset(visitor);

export function measureAsync() {
  return validateDocument({
    document: rebillyDocument,
    config,
  });
}
