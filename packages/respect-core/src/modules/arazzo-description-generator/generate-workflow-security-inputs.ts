export function generateWorkflowSecurityInputs(inputsComponents: any, security: any[]) {
  if (!security?.length) {
    return undefined;
  }

  for (const securityRequirement of security) {
    for (const securityName of Object.keys(securityRequirement)) {
      if (inputsComponents?.inputs?.[securityName]) {
        return {
          $ref: `#/components/inputs/${securityName}`,
        };
      }
    }
  }

  return undefined;
}
