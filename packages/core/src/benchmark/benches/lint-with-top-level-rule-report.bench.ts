import { readFileSync } from 'fs';
import { join as pathJoin, resolve as pathResolve } from 'path';
import { lintDocument } from '../../lint.js';
import { BaseResolver } from '../../resolve.js';
import { parseYamlToDocument, makeConfigForRuleset } from '../utils.js';

import type { StyleguideConfig } from '../../config/index.js';

export const name = 'Validate with single top-level rule and report';
export const count = 10;
const rebillyDefinitionRef = pathResolve(pathJoin(__dirname, 'rebilly.yaml'));
const rebillyDocument = parseYamlToDocument(
  readFileSync(rebillyDefinitionRef, 'utf-8'),
  rebillyDefinitionRef
);

let config: StyleguideConfig;
export async function setupAsync() {
  config = await makeConfigForRuleset({
    test: () => {
      return {
        Schema(schema, ctx) {
          if (schema.type === 'number') {
            ctx.report({
              message: 'type number is not allowed',
            });
          }
        },
      };
    },
  });
}

export function measureAsync() {
  return lintDocument({
    externalRefResolver: new BaseResolver(),
    document: rebillyDocument,
    config,
  });
}
