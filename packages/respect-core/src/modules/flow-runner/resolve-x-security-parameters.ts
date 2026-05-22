import type { ExtendedSecurity, OAuth2Auth } from '@redocly/openapi-core';
import type { Oas3SecurityScheme } from 'core/src/typings/openapi.js';

import type { Step, RuntimeExpressionContext, TestContext } from '../../types.js';
import {
  exchangeOAuth2Token,
  pickOAuth2ExchangeableFlow,
} from '../../utils/oauth2/exchange-oauth2-token.js';
import { getSecurityParameter } from '../context-parser/get-security-parameters.js';
import type { ParameterWithIn } from '../context-parser/index.js';
import type { OperationDetails } from '../description-parser/get-operation-from-description.js';
import { evaluateRuntimeExpressionPayload } from '../runtime-expressions/index.js';
import { resolveSecurityScheme } from './resolve-security-scheme.js';
import { validateXSecurityParameters } from './validate-x-security-parameters.js';

export async function resolveXSecurityParameters({
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
}): Promise<ParameterWithIn[]> {
  const stepXSecurity = step['x-security'] as ExtendedSecurity[] | undefined;
  const workflowLevelXSecurity = workflowLevelXSecurityParameters as ExtendedSecurity[] | undefined;

  const securities = [...(workflowLevelXSecurity || []), ...(stepXSecurity || [])];
  const parameters: ParameterWithIn[] = [];

  for (const security of securities) {
    const scheme = resolveSecurityScheme({
      ctx,
      security,
      operation,
    });

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
          logger: ctx.options.logger,
        });
        if (security.values) {
          security.values[key] = evaluatedValue;
        }
        return [key, evaluatedValue];
      })
    );

    if (
      scheme.type === 'oauth2' &&
      !values.accessToken &&
      pickOAuth2ExchangeableFlow(scheme as OAuth2Auth, values)
    ) {
      const accessToken = await exchangeOAuth2Token({
        scheme: scheme as OAuth2Auth,
        values,
        ctx,
      });
      values.accessToken = accessToken;
      if (security.values) {
        security.values.accessToken = accessToken;
      }
    }

    const resolvedSecurity = validateXSecurityParameters({ scheme, values });
    const param = getSecurityParameter(resolvedSecurity, ctx);

    if (param) {
      parameters.push(param);
    }
  }

  return parameters;
}
