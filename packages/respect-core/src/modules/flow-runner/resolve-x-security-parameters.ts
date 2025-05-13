import { evaluateRuntimeExpressionPayload } from '../runtime-expressions/index.js';

import type { ParameterWithIn } from '../config-parser/index.js';
import type { Step, RuntimeExpressionContext } from '../../types.js';
import type { OperationDetails } from '../description-parser/get-operation-from-description.js';

export function resolveXSecurityParameters(
  ctx: RuntimeExpressionContext,
  step: Step,
  operation: (OperationDetails & Record<string, any>) | undefined
) {
  const { 'x-security': xSecurity } = step;
  const xSecurityParameters: ParameterWithIn[] = [];

  if (!xSecurity) {
    return xSecurityParameters;
  }

  for (const securityScheme of xSecurity) {
    const { schemeName, scheme, values } = securityScheme;

    const resolvedValues = Object.entries(values || {}).reduce<Record<string, any>>(
      (acc, [key, value]) => ({
        ...acc,
        [key]: evaluateRuntimeExpressionPayload({ payload: value, context: ctx }),
      }),
      {}
    );

    let resolvedSchema = null;
    if (schemeName) {
      resolvedSchema = operation?.securitySchemes[schemeName] || null;
    } else {
      resolvedSchema = scheme;
    }

    // TODO: replace with the Auth algorithm functions
    if (resolvedSchema?.type === 'apiKey' && resolvedValues?.value) {
      xSecurityParameters.push({
        name: resolvedSchema.name,
        in: resolvedSchema.in,
        value: resolvedValues.value as string | number | boolean,
      });
    } else if (resolvedSchema?.type === 'http' && resolvedSchema?.scheme === 'basic') {
      const { username, password } = resolvedValues;
      xSecurityParameters.push({
        name: 'Authorization',
        in: 'header',
        value: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      });
    } else if (resolvedSchema?.type === 'http' && resolvedSchema?.scheme === 'bearer') {
      const { token } = resolvedValues;
      xSecurityParameters.push({
        name: 'Authorization',
        in: 'header',
        value: `Bearer ${token}`,
      });
    }
  }

  return xSecurityParameters;
}
