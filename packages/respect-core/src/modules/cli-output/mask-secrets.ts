export const POTENTIALLY_SECRET_FIELDS = ['token', 'access_token', 'id_token', 'password'];

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
      maskedString = maskedString.split(secret).join('*'.repeat(8));
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

export function findPotentiallySecretObjectFields(
  obj: any,
  tokenKeys: string[] = POTENTIALLY_SECRET_FIELDS
): string[] {
  const foundTokens: string[] = [];

  if (!obj || typeof obj !== 'object') {
    return foundTokens;
  }

  // Generate all possible casing variations for the token keys
  const allTokenVariations = new Set<string>();
  const allTokenVariationsLower = new Set<string>();

  for (const tokenKey of tokenKeys) {
    const variations = generateCasingVariations(tokenKey);
    for (const variation of variations) {
      allTokenVariations.add(variation);
      allTokenVariationsLower.add(variation.toLowerCase());
    }
  }

  const searchInObject = (currentObj: any) => {
    if (!currentObj || typeof currentObj !== 'object') {
      return;
    }

    if (Array.isArray(currentObj)) {
      for (const item of currentObj) {
        searchInObject(item);
      }
      return;
    }

    for (const key in currentObj) {
      const value = currentObj[key];

      // Check if the key matches any of the token variations (case-insensitive)
      if (allTokenVariations.has(key) || allTokenVariationsLower.has(key.toLowerCase())) {
        if (typeof value === 'string' && value.trim()) {
          foundTokens.push(value);
        }
      }

      if (value && typeof value === 'object') {
        searchInObject(value);
      }
    }
  };

  searchInObject(obj);
  return foundTokens;
}

function generateCasingVariations(fieldName: string): string[] {
  const variations = new Set<string>();
  variations.add(fieldName);

  if (fieldName.includes('_')) {
    // snake_case to camelCase
    const camelCase = fieldName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    variations.add(camelCase);

    // snake_case to kebab-case
    const kebabCase = fieldName.replace(/_/g, '-');
    variations.add(kebabCase);

    // snake_case to PascalCase
    const pascalCase = fieldName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    variations.add(pascalCase);
  }

  if (fieldName.includes('-')) {
    // kebab-case to camelCase
    const camelCase = fieldName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    variations.add(camelCase);

    // kebab-case to snake_case
    const snakeCase = fieldName.replace(/-/g, '_');
    variations.add(snakeCase);

    // kebab-case to PascalCase
    const pascalCase = fieldName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    variations.add(pascalCase);
  }

  if (/[a-z][A-Z]/.test(fieldName)) {
    // camelCase to snake_case
    const snakeCase = fieldName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    variations.add(snakeCase);

    // camelCase to kebab-case
    const kebabCase = fieldName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    variations.add(kebabCase);

    // camelCase to PascalCase
    const pascalCase = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    variations.add(pascalCase);
  }

  if (/^[A-Z][a-z]/.test(fieldName)) {
    // PascalCase to camelCase
    const camelCase = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
    variations.add(camelCase);

    // PascalCase to snake_case
    const snakeCase = fieldName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    variations.add(snakeCase);

    // PascalCase to kebab-case
    const kebabCase = fieldName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    variations.add(kebabCase);
  }

  variations.add(fieldName.toLowerCase());
  variations.add(fieldName.toUpperCase());

  return Array.from(variations);
}
