/**
 * Checks if value matches specified JSON schema type
 *
 * @param {*} value - value to check
 * @param {JSONSchemaType} type - JSON Schema type
 * @returns boolean
 */
export function matchesJsonSchemaType(value: any, type: string): boolean {
  switch (type) {
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'null':
      return value === null;
    case 'integer':
      return Number.isInteger(value);
    default:
      // eslint-disable-next-line valid-typeof
      return typeof value === type;
  }
}

export function missingRequiredField(type: string, field: string): string {
  return `${type} object should contain "${field}" field.`;
}
