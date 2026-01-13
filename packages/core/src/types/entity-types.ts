import type { NodeType } from './index.js';

/**
 * Entity node types for catalog entity validation
 * These types represent different parts of a catalog entity structure
 */

/**
 * Entity - The root entity object
 * Represents the entire catalog entity
 */
export const Entity: NodeType = {
  properties: {
    key: { type: 'string' },
    type: { type: 'string' },
    title: { type: 'string' },
    summary: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    metadata: 'EntityMetadata',
    relations: 'EntityRelations',
    git: { type: 'array' },
    contact: {},
    links: { type: 'array' },
    sourceFile: { type: 'string' },
  },
  extensionsPrefix: 'x-',
};
/**
 * EntityMetadata - The metadata property of an entity
 * Represents nested metadata object
 */
export const EntityMetadata: NodeType = {
  properties: {},
  additionalProperties: {},
  extensionsPrefix: 'x-',
};

/**
 * EntityRelations - The relations array
 * Represents the array of relations
 */
export const EntityRelations: NodeType = {
  properties: {},
  items: 'EntityRelation',
};

/**
 * EntityRelation - A single relation object
 * Represents one relation in the relations array
 */
export const EntityRelation: NodeType = {
  properties: {
    type: { type: 'string' },
    key: { type: 'string' },
  },
  additionalProperties: {},
  extensionsPrefix: 'x-',
};

/**
 * Root type for entity documents
 * Resolves directly to Entity type
 */
export const EntityRoot: NodeType = {
  properties: {},
  // The root entity document resolves directly as Entity
  // This is handled by using Entity as the rootType in walkDocument
};

export const entityNodeTypes: Record<string, NodeType> = {
  Entity,
  EntityMetadata,
  EntityRelations,
  EntityRelation,
  EntityRoot,
};
