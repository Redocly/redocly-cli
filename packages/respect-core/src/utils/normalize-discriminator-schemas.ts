export function normalizeDiscriminatorSchemas<T>(schema: T): T {
  if (!schema || typeof schema !== 'object') return schema;

  const schemaCopy = JSON.parse(JSON.stringify(schema));
  processNode(schemaCopy);
  return schemaCopy;
}

function processNode(node: any): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) {
      processNode(item);
    }
    return;
  }

  // to check if node has a discriminator with oneOf/anyOf
  if (node.discriminator?.propertyName && (node.oneOf || node.anyOf)) {
    const tagName = node.discriminator.propertyName;
    const variants = node.oneOf || node.anyOf;

    for (const variant of variants) {
      normalizeDiscriminatorProperty(variant, tagName);
    }
  }

  for (const key of Object.keys(node)) {
    processNode(node[key]);
  }
}

function normalizeDiscriminatorProperty(variant: any, tagName: string): void {
  if (!variant?.properties?.[tagName]) return;

  const propSchema = variant.properties[tagName];

  if (propSchema.const !== undefined || propSchema.enum) return;

  if (propSchema.allOf && Array.isArray(propSchema.allOf)) {
    for (const subschema of propSchema.allOf) {
      if (subschema && typeof subschema === 'object') {
        if (subschema.const !== undefined) {
          propSchema.const = subschema.const;
          return;
        }
        if (subschema.enum) {
          propSchema.enum = subschema.enum;
          return;
        }
      }
    }
  }
}
