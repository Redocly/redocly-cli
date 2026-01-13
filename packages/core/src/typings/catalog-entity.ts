/**
 * TypeScript types for catalog entity objects
 * These represent the parsed JSON structure of entity files
 */

export type CatalogEntityRelationType =
  | 'dependsOn'
  | 'ownedBy'
  | 'memberOf'
  | 'partOf'
  | 'consumes'
  | 'provides';

export type CatalogEntityRelation = {
  type: CatalogEntityRelationType;
  key: string;
  version?: string;
  revision?: string;
};

export type CatalogEntityLink = {
  label: string;
  url: string;
};

export type CatalogEntityContact = {
  slack?: {
    channels: Array<{
      name: string;
      url?: string;
    }>;
  };
};

export type CatalogEntityMetadata = Record<string, unknown>;

export type CatalogUserMetadata = {
  email: string;
} & Record<string, unknown>;

export type CatalogApiDescriptionMetadata = {
  specType: 'openapi' | 'asyncapi' | 'arazzo';
  descriptionFile: string;
} & Record<string, unknown>;

export type CatalogApiOperationMetadata = {
  method:
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'PATCH'
    | 'MUTATION'
    | 'QUERY'
    | 'SUBSCRIBE'
    | 'PUBLISH';
  path: string;
  payload?: string[];
  responses?: string[];
} & Record<string, unknown>;

export type CatalogDataSchemaMetadata = {
  specType: 'openapi' | 'asyncapi' | 'arazzo';
  schema?: string;
  sdl?: string;
} & Record<string, unknown>;

/**
 * Base entity structure with common properties
 */
export type CatalogEntityBase = {
  version?: string | null;
  revision?: string;
  key: string;
  title: string;
  summary?: string | null;
  tags?: string[] | null;
  git?: string[] | null;
  contact?: CatalogEntityContact | null;
  links?: CatalogEntityLink[] | null;
  relations?: CatalogEntityRelation[] | null;
};

/**
 * Entity type discriminated union
 * Represents different entity types with their specific metadata
 */
export type CatalogEntity =
  | (CatalogEntityBase & {
      type: 'user';
      metadata: CatalogUserMetadata;
    })
  | (CatalogEntityBase & {
      type: 'api-description';
      metadata: CatalogApiDescriptionMetadata;
    })
  | (CatalogEntityBase & {
      type: 'api-operation';
      metadata: CatalogApiOperationMetadata;
    })
  | (CatalogEntityBase & {
      type: 'data-schema';
      metadata: CatalogDataSchemaMetadata;
    })
  | (CatalogEntityBase & {
      type: 'service' | 'domain' | 'team';
      metadata?: CatalogEntityMetadata;
    });
