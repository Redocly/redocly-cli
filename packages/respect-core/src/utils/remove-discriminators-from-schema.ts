/**
 * removes `discriminator` keywords from a fully-dereferenced schema.
 */
export function removeDiscriminatorsFromSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;

  stripDiscriminators(schema);
  return schema;
}

function stripDiscriminators(node: any): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) {
      stripDiscriminators(item);
    }
    return;
  }

  if ('discriminator' in node) {
    delete node.discriminator;
  }

  for (const key of Object.keys(node)) {
    stripDiscriminators(node[key]);
  }
}
