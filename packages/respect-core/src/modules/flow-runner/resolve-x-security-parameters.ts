import { evaluateRuntimeExpressionPayload } from '../runtime-expressions/index.js';
import { getSecurityParameters } from '../config-parser/get-security-parameters.js';
import { validateXSecurityParameters } from './validate-x-security-parameters.js';

import type { ExtendedSecurity } from 'core/src/typings/arazzo.js';
import type { ParameterWithIn } from '../config-parser/index.js';
import type { Step, RuntimeExpressionContext } from '../../types.js';
import type { OperationDetails } from '../description-parser/get-operation-from-description.js';
import type { Oas3SecurityScheme } from 'core/src/typings/openapi.js';

export function resolveXSecurityParameters(
  ctx: RuntimeExpressionContext,
  step: Step,
  operation?: OperationDetails
): ParameterWithIn[] {
  const xSecurity = step['x-security'] as ExtendedSecurity[] | undefined;

  if (!xSecurity) {
    return [];
  }

  return xSecurity.map((security) => {
    const scheme =
      'schemeName' in security
        ? (operation?.securitySchemes?.[security.schemeName] as Oas3SecurityScheme)
        : security.scheme;

    const values = Object.fromEntries(
      Object.entries(security?.values ?? {}).map(([key, value]) => [
        key,
        evaluateRuntimeExpressionPayload({ payload: value, context: ctx }),
      ])
    );

    const resolvedSecurity = validateXSecurityParameters({
      scheme,
      values,
    });

    return getSecurityParameters(resolvedSecurity);
  });
}
