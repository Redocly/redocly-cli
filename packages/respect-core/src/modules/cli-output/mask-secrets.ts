export function maskSecrets(target: { [x: string]: any } | string, secretValues: Set<string>) {
  const maskValue = (): string => '*'.repeat(8);

  if (typeof target === 'string') {
    let maskedString = target;
    secretValues.forEach((secret) => {
      maskedString = maskedString.split(secret).join('*'.repeat(secret.length));
    });
    return maskedString;
  }

  const masked = JSON.parse(JSON.stringify(target));
  const maskIfContainsSecret = (value: string): string => {
    return containsSecret(value, secretValues) ? maskValue() : value;
  };

  const maskRecursive = (current: any) => {
    for (const key in current) {
      if (typeof current[key] === 'string') {
        current[key] = maskIfContainsSecret(current[key]);
      } else if (typeof current[key] === 'object' && current[key] !== null) {
        maskRecursive(current[key]);
      }
    }
  };
  maskRecursive(masked);

  return masked;
}

export function containsSecret(value: string, secretValues: Set<string>): boolean {
  return Array.from(secretValues).some((secret) => value.includes(secret));
}
