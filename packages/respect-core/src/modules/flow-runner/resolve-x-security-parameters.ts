import { evaluateRuntimeExpressionPayload } from '../runtime-expressions/index.js';
import { getSecurityParameters } from '../context-parser/get-security-parameters.js';
import { validateXSecurityParameters } from './validate-x-security-parameters.js';

import type { ExtendedSecurity } from '@redocly/openapi-core';
import type { ParameterWithIn } from '../context-parser/index.js';
import type { Step, RuntimeExpressionContext } from '../../types.js';
import type { OperationDetails } from '../description-parser/get-operation-from-description.js';
import type { Oas3SecurityScheme } from 'core/src/typings/openapi.js';

export function resolveXSecurityParameters(
  ctx: RuntimeExpressionContext,
  step: Step,
  operation?: OperationDetails & { securitySchemes: Record<string, Oas3SecurityScheme> }
): ParameterWithIn[] {
  const xSecurity = step['x-security'] as ExtendedSecurity[] | undefined;

  if (!xSecurity) {
    return [];
  }

  return xSecurity
    .map((security) => {
      const scheme =
        'schemeName' in security
          ? (operation?.securitySchemes?.[security.schemeName] as Oas3SecurityScheme)
          : security.scheme;

      const values = Object.fromEntries(
        Object.entries(security?.values ?? {}).map(([key, value]) => {
          const evaluatedValue = evaluateRuntimeExpressionPayload({ payload: value, context: ctx });
          if (security.values) {
            security.values[key] = evaluatedValue;
          }
          return [key, evaluatedValue];
        })
      );

      const resolvedSecurity = validateXSecurityParameters({ scheme, values });

      return getSecurityParameters(resolvedSecurity);
    })
    .filter((param): param is ParameterWithIn => param !== undefined);
}
