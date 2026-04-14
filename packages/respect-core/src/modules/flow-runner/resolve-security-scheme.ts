import type { Oas3SecurityScheme } from 'core/src/typings/openapi.js';

import type { ExtendedSecurity, TestContext } from '../../types.js';
import type { OperationDetails } from '../description-parser/get-operation-from-description.js';

export function resolveSecurityScheme({
  ctx,
  security,
  operation,
}: {
  ctx: TestContext;
  security: ExtendedSecurity;
  operation?: OperationDetails & { securitySchemes?: Record<string, Oas3SecurityScheme> };
}): Oas3SecurityScheme | undefined {
  const { scheme, schemeName } = security;

  if (scheme) {
    return security.scheme as Oas3SecurityScheme;
  }

  if (!schemeName) {
    return undefined;
  }

  if (typeof schemeName === 'string' && schemeName.startsWith('$sourceDescriptions.')) {
    const [_, sourceName, schemeKey] = schemeName.split('.');
    const sourceDescription = sourceName && ctx.$sourceDescriptions[sourceName];
    const schemes = sourceDescription?.components?.securitySchemes;

    return schemeKey && schemes ? schemes[schemeKey] : undefined;
  }

  return operation?.securitySchemes?.[schemeName];
}
