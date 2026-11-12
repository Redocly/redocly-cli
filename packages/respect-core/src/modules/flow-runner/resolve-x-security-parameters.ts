import type { ExtendedSecurity, Oas3SecurityScheme } from '@redocly/openapi-core';

import type { Step, RuntimeExpressionContext, TestContext } from '../../types.js';
import { getSecurityParameter } from '../context-parser/get-security-parameters.js';
import type { ParameterWithIn } from '../context-parser/index.js';
import type { OperationDetails } from '../description-parser/get-operation-from-description.js';
import { evaluateRuntimeExpressionPayload } from '../runtime-expressions/index.js';
import { resolveSecurityScheme } from './resolve-security-scheme.js';
import { validateXSecurityParameters } from './validate-x-security-parameters.js';

export type DigestCredentials = { username: string; password: string };

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
}): { parameters: ParameterWithIn[]; digestCredentials?: DigestCredentials } {
  const stepXSecurity = step['x-security'] as ExtendedSecurity[] | undefined;
  const workflowLevelXSecurity = workflowLevelXSecurityParameters as ExtendedSecurity[] | undefined;

  const securities = [...(workflowLevelXSecurity || []), ...(stepXSecurity || [])];
  const parameters: ParameterWithIn[] = [];
  let digestCredentials: DigestCredentials | undefined;

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

    const resolvedSecurity = validateXSecurityParameters({ scheme, values });
    const param = getSecurityParameter(resolvedSecurity, ctx);

    if (param) {
      parameters.push(param);
    }

    // The last entry that sets the Authorization header wins
    if (scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'digest') {
      digestCredentials = {
        username: values.username as string,
        password: values.password as string,
      };
    } else if (param?.in === 'header' && param.name.toLowerCase() === 'authorization') {
      digestCredentials = undefined;
    }
  }

  return { parameters, digestCredentials };
}
