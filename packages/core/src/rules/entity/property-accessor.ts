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
 * Supports both file structure (relations array) and database structure (owners/domains arrays)
 */
export interface CatalogEntity {
  [key: string]: unknown;
  relations?: CatalogEntityRelation[];
  owners?: Array<{ key: string; [key: string]: unknown }>;
  domains?: Array<{ key: string; [key: string]: unknown }>;
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
  // Supports both file structure (relations array) and database structure (owners/domains arrays)
  if (path.startsWith('relations.')) {
    const relationType = path.substring('relations.'.length);
    if (!relationType) return undefined;

    // First, try file structure: relations array
    const relations = entity.relations || [];
    const relation = relations.find((rel) => rel?.type === relationType);

    if (relation) {
      // Return the key property of the relation
      return relation.key;
    }

    // If not found, try database structure: owners/domains arrays
    // For 'ownedBy' relation type, check owners array
    if (relationType === 'ownedBy' && Array.isArray(entity.owners)) {
      if (entity.owners.length === 0) {
        // Empty array - return undefined (will fail defined assertion)
        return undefined;
      }
      const owner = entity.owners[0]; // Get first owner
      if (owner && typeof owner === 'object' && 'key' in owner) {
        return owner.key;
      }
      return undefined;
    }

    // For 'domain' relation type, check domains array
    if (relationType === 'domain' && Array.isArray(entity.domains)) {
      if (entity.domains.length === 0) {
        // Empty array - return undefined (will fail defined assertion)
        return undefined;
      }
      const domain = entity.domains[0]; // Get first domain
      if (domain && typeof domain === 'object' && 'key' in domain) {
        return domain.key;
      }
      return undefined;
    }

    // Relation type not found in either structure
    return undefined;
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
