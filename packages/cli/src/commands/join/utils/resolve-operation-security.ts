import type { Oas3PathItem } from '@redocly/openapi-core';

import { type Oas3Method } from '../../split/types.js';
import type { AnyOas3Definition } from '../types.js';
import { addSecurityPrefix } from './add-security-prefix.js';

export function resolveOperationSecurity({
  pathItem,
  pathOperation,
  openapi,
  componentsPrefix,
}: {
  pathItem: Oas3PathItem;
  pathOperation: NonNullable<Oas3PathItem[Oas3Method]>;
  openapi: AnyOas3Definition;
  componentsPrefix: string | undefined;
}) {
  if (pathOperation.hasOwnProperty('security')) {
    return addSecurityPrefix(pathOperation.security, componentsPrefix!);
  }

  if (pathItem.hasOwnProperty('security')) {
    return addSecurityPrefix(
      (pathItem as Oas3PathItem & { security: AnyOas3Definition['security'] }).security,
      componentsPrefix!
    );
  }

  if (openapi.hasOwnProperty('security')) {
    return addSecurityPrefix(openapi.security, componentsPrefix!);
  }

  return undefined;
}
