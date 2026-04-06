import { logger } from '@redocly/openapi-core';
import { blue } from 'colorette';
import * as path from 'node:path';

import type { AnyOas3Definition, JoinDocumentContext } from '../types.js';

export function collectExternalDocs({
  joinedDef,
  openapi,
  context,
}: {
  joinedDef: any;
  openapi: AnyOas3Definition;
  context: JoinDocumentContext;
}) {
  const { api } = context;
  const { externalDocs } = openapi;
  if (externalDocs) {
    if (joinedDef.hasOwnProperty('externalDocs')) {
      logger.warn(`warning: skip externalDocs from ${blue(path.basename(api))} \n`);
      return;
    }
    joinedDef['externalDocs'] = externalDocs;
  }
}
