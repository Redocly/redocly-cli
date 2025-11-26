/**
 * Property accessor utilities for catalog entities
 * Handles dot notation and relation sugar syntax
 */

/**
 * Catalog entity relation structure
 */
export interface CatalogEntityRelation {
  type: string;
  key: string;
  [key: string]: unknown;
}

/**
 * Catalog entity structure
 */
export interface CatalogEntity {
  [key: string]: unknown;
  relations?: CatalogEntityRelation[];
}

/**
 * Get property value from entity using dot notation
 * Supports relation sugar syntax (e.g., relations.ownedBy)
 *
 * @param entity - The catalog entity object
 * @param path - Property path using dot notation (e.g., "title", "metadata.onCall", "relations.ownedBy")
 * @returns The property value or undefined if not found
 *
 * @example
 * getEntityProperty(entity, "title") // entity.title
 * getEntityProperty(entity, "metadata.onCall") // entity.metadata?.onCall
 * getEntityProperty(entity, "relations.ownedBy") // Find relation with type="ownedBy", return its key
 */
export function getEntityProperty(entity: CatalogEntity, path: string): unknown {
  if (!path) return undefined;

  // Handle relation sugar syntax: relations.ownedBy, relations.dependsOn, etc.
  if (path.startsWith('relations.')) {
    const relationType = path.substring('relations.'.length);
    if (!relationType) return undefined;

    const relations = entity.relations || [];
    const relation = relations.find((rel) => rel?.type === relationType);

    if (!relation) return undefined;

    // Return the key property of the relation
    return relation.key;
  }

  // Handle regular dot notation
  const parts = path.split('.');
  let value: unknown = entity;

  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined;
    }
    // Type guard: value must be an object/array to access properties
    if (typeof value !== 'object') {
      return undefined;
    }
    value = (value as Record<string, unknown>)[part];
  }

  return value;
}

/**
 * Check if a property path is a relation sugar syntax
 */
export function isRelationSugarSyntax(path: string): boolean {
  return path.startsWith('relations.') && path !== 'relations';
}

/**
 * Get the relation type from a relation sugar syntax path
 */
export function getRelationTypeFromPath(path: string): string | undefined {
  if (!isRelationSugarSyntax(path)) return undefined;
  return path.substring('relations.'.length);
}
