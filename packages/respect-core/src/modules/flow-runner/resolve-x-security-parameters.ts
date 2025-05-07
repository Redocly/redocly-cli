import type { ParameterWithIn } from '../config-parser/index.js';
import type { Step } from '../../types.js';
import type { OperationDetails } from '../description-parser/get-operation-from-description.js';

export function resolveXSecurityParameters(
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
    let resolvedSchema = null;
    if (schemeName) {
      resolvedSchema = operation?.securitySchemes[schemeName] || null;
    } else {
      resolvedSchema = scheme;
    }

    // TODO: replace with the Auth algorithm functions
    if (resolvedSchema?.type === 'apiKey' && values?.value) {
      xSecurityParameters.push({
        name: resolvedSchema.name,
        in: resolvedSchema.in,
        value: values?.value as string | number | boolean,
      });
    } else if (resolvedSchema?.type === 'http' && resolvedSchema?.scheme === 'basic') {
      const { username, password } = values;
      xSecurityParameters.push({
        name: 'Authorization',
        in: 'header',
        value: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      });
    }
  }

  return xSecurityParameters;
}
