import * as path from 'path';
import { readFileSync } from 'fs';
import { resolveDocument, BaseResolver } from '../../resolve.js';
import { parseYamlToDocument } from '../utils.js';
import { Oas3Types } from '../../types/oas3.js';
import { normalizeTypes } from '../../types/index.js';

export const name = 'Resolve with no external refs';
export const count = 10;
const rebillyDefinitionRef = path.resolve(path.join(__dirname, 'rebilly.yaml'));
const rebillyDocument = parseYamlToDocument(
  readFileSync(rebillyDefinitionRef, 'utf-8'),
  rebillyDefinitionRef
);
const externalRefResolver = new BaseResolver();

export function measureAsync() {
  return resolveDocument({
    rootDocument: rebillyDocument,
    externalRefResolver,
    rootType: normalizeTypes(Oas3Types).Root,
  });
}
