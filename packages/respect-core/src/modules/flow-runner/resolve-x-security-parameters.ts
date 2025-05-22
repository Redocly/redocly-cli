import { evaluateRuntimeExpressionPayload } from '../runtime-expressions/index.js';
import { getSecurityParameters } from '../context-parser/get-security-parameters.js';
import { validateXSecurityParameters } from './validate-x-security-parameters.js';

import type { ExtendedSecurity } from '@redocly/openapi-core';
import type { ParameterWithIn } from '../context-parser/index.js';
import type { Step, RuntimeExpressionContext } from '../../types.js';
import type { OperationDetails } from '../description-parser/get-operation-from-description.js';
import type { Oas3SecurityScheme } from 'core/src/typings/openapi.js';

function getSecuritySchemeKey(security: ExtendedSecurity): string {
  if ('schemeName' in security) {
    return security.schemeName;
  }
  const scheme = security.scheme as {
    type: string;
    scheme?: string;
    name?: string;
    flows?: Record<string, any>;
    openIdConnectUrl?: string;
    in?: string;
  };
  let flowType: string;

  switch (scheme.type) {
    case 'apiKey':
      return `${scheme.type}-${scheme.name}-${scheme.in}`;
    case 'oauth2':
      // For OAuth2, we'll use the first flow type as part of the key
      flowType = Object.keys(scheme.flows || {})[0] || 'default';
      return `${scheme.type}-${flowType}`;
    case 'openIdConnect':
      return `${scheme.type}-${scheme.openIdConnectUrl}`;
    default:
      return `${scheme.type}-${scheme.scheme}`;
  }
}

export function resolveXSecurityParameters({
  runtimeContext,
  step,
  operation,
  workflowLevelXSecurityParameters,
}: {
  runtimeContext: RuntimeExpressionContext;
  step: Step;
  operation?: OperationDetails & { securitySchemes: Record<string, Oas3SecurityScheme> };
  workflowLevelXSecurityParameters?: ExtendedSecurity[];
}): ParameterWithIn[] {
  const stepXSecurity = step['x-security'] as ExtendedSecurity[] | undefined;
  const workflowLevelXSecurity = workflowLevelXSecurityParameters as ExtendedSecurity[] | undefined;

  // Convert array to parameters and process them
  return [...(workflowLevelXSecurity || []), ...(stepXSecurity || [])]
    .map((security) => {
      const scheme =
        'schemeName' in security
          ? (operation?.securitySchemes?.[security.schemeName] as Oas3SecurityScheme)
          : security.scheme;

      if ('schemeName' in security && !scheme) {
        throw new Error(`Security scheme "${security.schemeName}" not found`);
      }

      if (!scheme) {
        return undefined;
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

      return getSecurityParameters(resolvedSecurity);
    })
    .filter((param): param is ParameterWithIn => param !== undefined);
}
