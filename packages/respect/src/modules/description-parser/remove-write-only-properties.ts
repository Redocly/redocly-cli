import type { JSONSchemaType } from '@redocly/ajv/dist/2020';

export function removeWriteOnlyProperties<T>(schema: JSONSchemaType<T>): JSONSchemaType<T> {
  const schemaCopy = JSON.parse(JSON.stringify(schema));

  function filterWriteOnlyProps(schema: JSONSchemaType<T>) {
    if (schema.type === 'object') {
      if (schema.properties) {
        for (const key in schema.properties) {
          if (schema.properties[key].writeOnly) {
            delete schema.properties[key];
            if (schema.required) {
              schema.required = schema.required.filter((prop: string) => prop !== key);
            }
          } else {
            filterWriteOnlyProps(schema.properties[key] as JSONSchemaType<T>);
          }
        }
      }
      if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        filterWriteOnlyProps(schema.additionalProperties as JSONSchemaType<T>);
      }
    } else if (schema.type === 'array' && schema.items) {
      filterWriteOnlyProps(schema.items as JSONSchemaType<T>);
    }

    if (schema.oneOf) {
      schema.oneOf = schema.oneOf.map((subSchema: JSONSchemaType<T>) =>
        filterWriteOnlyProps(subSchema as JSONSchemaType<T>),
      );
    }
    if (schema.allOf) {
      schema.allOf = schema.allOf.map((subSchema: JSONSchemaType<T>) =>
        filterWriteOnlyProps(subSchema as JSONSchemaType<T>),
      );
    }
    if (schema.anyOf) {
      schema.anyOf = schema.anyOf.map((subSchema: JSONSchemaType<T>) =>
        filterWriteOnlyProps(subSchema as JSONSchemaType<T>),
      );
    }
    return schema;
  }

  return filterWriteOnlyProps(schemaCopy);
}
