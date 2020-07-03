export type ScalarSchema = {
  name?: never;
  type?: 'string' | 'boolean' | 'number' | 'integer' | 'object' | 'array';
  items?: ScalarSchema;
  enum?: string[];
  referenceable?: boolean;
  directResolveAs?: string;
};

export type NormalizedScalarSchema = {
  name?: never;
  type?: 'string' | 'boolean' | 'number' | 'integer' | 'object' | 'array';
  items?: ScalarSchema;
  enum?: string[];
  referenceable?: boolean;
  directResolveAs?: NormalizedNodeType;
};

export type NodeType = {
  properties: Record<string, PropType | ResolveTypeFn>;
  additionalProperties?: PropType | ResolveTypeFn;
  items?: string;
  required?: string[] | ((value: any, key: string | number | undefined) => string[]);
};
type PropType = string | NodeType | ScalarSchema | undefined | null;
type ResolveTypeFn = (value: any, key: string) => string | PropType;

export type NormalizedNodeType = {
  name: string;
  properties: Record<string, NormalizedPropType | NormalizedResolveTypeFn>;
  additionalProperties?: NormalizedPropType | NormalizedResolveTypeFn;
  items?: NormalizedNodeType;
  required?: string[] | ((value: any, key: string | number | undefined) => string[]);
};

type NormalizedPropType = NormalizedNodeType | NormalizedScalarSchema | undefined | null;
type NormalizedResolveTypeFn = (
  value: any,
  key: string,
) => NormalizedNodeType | NormalizedScalarSchema | undefined | null;

export function listOf(typeName: string) {
  return {
    name: typeName + '_List',
    properties: {},
    items: typeName,
  };
}

export function mapOf(typeName: string) {
  return {
    name: typeName + '_Map',
    properties: {},
    additionalProperties: () => typeName,
  };
}

export function normalizeTypes(
  types: Record<string, NodeType>,
): Record<string, NormalizedNodeType> {
  const normalizedTypes: Record<string, NormalizedNodeType> = {};

  for (const typeName of Object.keys(types)) {
    normalizedTypes[typeName] = {
      ...types[typeName],
      name: typeName,
    } as any;
  }

  for (const type of Object.values(normalizedTypes)) {
    normalizeType(type);
  }

  return normalizedTypes;

  function normalizeType(type: any) {
    if (type.additionalProperties) {
      type.additionalProperties = resolveType(type.additionalProperties);
    }
    if (type.items) {
      type.items = resolveType(type.items);
    }

    if (type.properties) {
      const mappedProps: Record<string, any> = {};
      for (const propName of Object.keys(type.properties)) {
        mappedProps[propName] = resolveType(type.properties[propName]);
      }
      type.properties = mappedProps;
    }
  }

  // typings are painful here...
  function resolveType(type?: any): any {
    if (typeof type === 'string') {
      if (!normalizedTypes[type]) {
        throw new Error(`Unknown type name found: ${type}`);
      }
      return normalizedTypes[type];
    } else if (typeof type === 'function') {
      return (value: any, key: string) => {
        return resolveType(type(value, key));
      };
    } else if (type && type.name) {
      type = { ...type };
      normalizeType(type);
      return type;
    } else if (type && type.directResolveAs) {
      return {
        ...type,
        directResolveAs: resolveType(type.directResolveAs),
      }
    } else {
      return type;
    }
  }
}


export function isNamedType(
  t: NormalizedNodeType | NormalizedScalarSchema | null | undefined,
): t is NormalizedNodeType {
  return typeof t?.name === 'string';
}