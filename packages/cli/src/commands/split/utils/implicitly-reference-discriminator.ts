import { slash, logger, isEmptyObject } from '@redocly/openapi-core';
import { blue, red } from 'colorette';
import * as path from 'node:path';

import { COMPONENTS } from '../constants.js';
import type { Oas3Component } from '../types.js';

export function implicitlyReferenceDiscriminator(
  obj: any,
  defName: string,
  filename: string,
  schemaFiles: any
) {
  if (!obj.discriminator) return;
  const defPtr = `#/${COMPONENTS}/${'schemas' as Oas3Component}/${defName}`;
  const implicitMapping: Record<string, string> = {};
  for (const [name, { inherits, filename: parentFilename }] of Object.entries(schemaFiles) as any) {
    if (inherits.indexOf(defPtr) > -1) {
      const res = slash(path.relative(path.dirname(filename), parentFilename));
      implicitMapping[name] = res.startsWith('.') ? res : './' + res;
    }
  }

  if (isEmptyObject(implicitMapping)) return;
  const discriminatorPropSchema = obj.properties[obj.discriminator.propertyName];
  const discriminatorEnum = discriminatorPropSchema && discriminatorPropSchema.enum;
  const mapping = (obj.discriminator.mapping = obj.discriminator.mapping || {});
  for (const name of Object.keys(implicitMapping)) {
    if (discriminatorEnum && !discriminatorEnum.includes(name)) {
      continue;
    }
    if (mapping[name] && mapping[name] !== implicitMapping[name]) {
      logger.warn(
        `warning: explicit mapping overlaps with local mapping entry ${red(name)} at ${blue(
          filename
        )}. Please check it.`
      );
    }
    mapping[name] = implicitMapping[name];
  }
}
