export function maskSecrets<T extends { [x: string]: any } | string>(
  target: T,
  secretValues: Set<string>
): T {
  const maskValue = (value: string, secret: string): string => {
    return value.replace(secret, '*'.repeat(8));
  };

  if (typeof target === 'string') {
    let maskedString = target as string;
    secretValues.forEach((secret) => {
      maskedString = maskedString.split(secret).join('*'.repeat(secret.length));
    });
    return maskedString as T;
  }

  const masked = JSON.parse(JSON.stringify(target));
  const maskIfContainsSecret = (value: string): string => {
    let maskedValue = value;

    for (const secret of secretValues) {
      if (maskedValue.includes(secret)) {
        maskedValue = maskValue(maskedValue, secret);
      }
    }

    return maskedValue;
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
