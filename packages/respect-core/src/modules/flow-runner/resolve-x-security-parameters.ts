import { evaluateRuntimeExpressionPayload } from '../runtime-expressions/index.js';
import { getSecurityParameter } from '../context-parser/get-security-parameters.js';
import { validateXSecurityParameters } from './validate-x-security-parameters.js';

import type { ExtendedSecurity } from '@redocly/openapi-core';
import type { ParameterWithIn } from '../context-parser/index.js';
import type { Step, RuntimeExpressionContext, TestContext } from '../../types.js';
import type { OperationDetails } from '../description-parser/get-operation-from-description.js';
import type { Oas3SecurityScheme } from 'core/src/typings/openapi.js';

export function resolveXSecurityParameters({
  ctx,
  runtimeContext,
  step,
  operation,
  workflowLevelXSecurityParameters,
}: {
  ctx: TestContext;
  runtimeContext: RuntimeExpressionContext;
  step: Step;
  operation?: OperationDetails & { securitySchemes: Record<string, Oas3SecurityScheme> };
  workflowLevelXSecurityParameters?: ExtendedSecurity[];
}): ParameterWithIn[] {
  const stepXSecurity = step['x-security'] as ExtendedSecurity[] | undefined;
  const workflowLevelXSecurity = workflowLevelXSecurityParameters as ExtendedSecurity[] | undefined;

  const securities = [...(workflowLevelXSecurity || []), ...(stepXSecurity || [])];
  const parameters: ParameterWithIn[] = [];

  for (const security of securities) {
    const scheme =
      'schemeName' in security
        ? (operation?.securitySchemes?.[security.schemeName] as Oas3SecurityScheme)
        : security.scheme;

    if ('schemeName' in security && !scheme) {
      throw new Error(`Security scheme "${security.schemeName}" not found`);
    }

    if (!scheme) {
      continue;
    }

    const values = Object.fromEntries(
      Object.entries(security?.values ?? {}).map(([key, value]) => {
        const evaluatedValue = evaluateRuntimeExpressionPayload({
          payload: value,
          context: runtimeContext,
        });
        if (security.values) {
          security.values[key] = evaluatedValue;
        }
        return [key, evaluatedValue];
      })
    );

    const resolvedSecurity = validateXSecurityParameters({ scheme, values });
    const param = getSecurityParameter(resolvedSecurity, ctx);

    if (param) {
      parameters.push(param);
    }
  }

  return parameters;
}
