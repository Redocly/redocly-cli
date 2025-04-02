import * as fs from 'node:fs';
import { join as pathJoin, resolve as pathResolve, dirname } from 'node:path';
import { lintDocument } from '../../lint.js';
import { BaseResolver } from '../../resolve.js';
import { parseYamlToDocument, makeConfigForRuleset } from '../utils.js';
import { fileURLToPath } from 'node:url';

import type { StyleguideConfig } from '../../config/index.js';

const __internalDirname = dirname(fileURLToPath(import.meta.url ?? __dirname));

export const name = 'Validate with 50 top-level rules';
export const count = 10;
const rebillyDefinitionRef = pathResolve(pathJoin(__internalDirname, 'rebilly.yaml'));
const rebillyDocument = parseYamlToDocument(
  fs.readFileSync(rebillyDefinitionRef, 'utf-8'),
  rebillyDefinitionRef
);

const ruleset: any = {};
for (let i = 0; i < 50; i++) {
  ruleset['rule-' + i] = () => {
    let count = 0;
    return {
      Schema() {
        count++;
        if (count === -1) throw new Error('Disable optimization');
      },
    };
  };
}

let config: StyleguideConfig;
export async function setupAsync() {
  config = await makeConfigForRuleset(ruleset);
}

export function measureAsync() {
  return lintDocument({
    externalRefResolver: new BaseResolver(),
    document: rebillyDocument,
    config,
  });
}
