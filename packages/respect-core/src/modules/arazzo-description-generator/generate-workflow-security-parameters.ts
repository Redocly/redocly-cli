import { type Oas3SecurityRequirement, type Oas3SecurityScheme } from 'core/src/typings/openapi';

export function generateWorkflowSecurityParameters(
  inputsComponents: any,
  security: Oas3SecurityRequirement[],
  securitySchemes: Record<string, Oas3SecurityScheme>
) {
  if (!security?.length) {
    return [];
  }

  const parameters = [];

  for (const securityRequirement of security) {
    for (const securityName of Object.keys(securityRequirement)) {
      if (!inputsComponents?.inputs?.[securityName]) {
        continue;
      }

      const securityScheme = securitySchemes[securityName];

      if (
        securityScheme?.type &&
        !['apikey', 'http'].includes(securityScheme?.type?.toLowerCase())
      ) {
        continue;
      }

      if (securityScheme?.scheme === 'bearer') {
        parameters.push({
          // TODO: clarify parameter name
          name: 'Authorization',
          value: `Bearer {$inputs.${securityName}}`,
          in: inputsComponents?.inputs?.[securityName]?.in || 'header',
        });
      } else if (securityScheme?.scheme === 'basic') {
        parameters.push({
          // TODO: clarify parameter name
          name: 'Authorization',
          value: `Basic ....`,
          in: inputsComponents?.inputs?.[securityName]?.in || 'header',
        });
      } else {
        continue;
      }
    }
  }

  return parameters;
}
