import { toAjvSchema } from '../to-ajv-schema.js';

describe('toAjvSchema', () => {
  it('should convert a dereferenced schema to the form that Ajv can compile', () => {
    // A dereferenced `$ref` is a copy of its target, so the copy shares `properties` with the target.
    const properties: Record<string, unknown> = { name: { type: 'string' } };
    const menuItem = {
      type: 'object',
      discriminator: { propertyName: 'category' },
      properties,
      'x-tags': ['menu'],
    };
    properties.related = { ...menuItem };

    const order = {
      type: 'object',
      properties: {
        item: menuItem,
        payment: {
          discriminator: { propertyName: 'method' },
          oneOf: [
            {
              type: 'object',
              required: ['method'],
              properties: { method: { type: 'string', enum: ['cash', 'check'] } },
            },
          ],
        },
      },
    };

    expect(toAjvSchema(order)).toMatchInlineSnapshot(`
      {
        "$defs": {
          "0": {
            "properties": {
              "name": {
                "type": "string",
              },
              "related": {
                "$ref": "#/$defs/0",
              },
            },
            "type": "object",
          },
          "1": {
            "properties": {
              "method": {
                "enum": [
                  "cash",
                  "check",
                ],
                "type": "string",
              },
            },
            "required": [
              "method",
            ],
            "type": "object",
          },
        },
        "properties": {
          "item": {
            "$ref": "#/$defs/0",
          },
          "payment": {
            "discriminator": {
              "propertyName": "method",
            },
            "oneOf": [
              {
                "$ref": "#/$defs/1",
              },
            ],
          },
        },
        "type": "object",
      }
    `);
  });

  it('should replace every converted schema with the result of adjustSchema', () => {
    const properties: Record<string, unknown> = { name: { type: 'string' } };
    const menuItem = { type: 'object', properties, 'x-tags': ['menu'] };
    properties.related = { ...menuItem };

    // The source is the dereferenced schema, so it still has the extension.
    const converted = toAjvSchema(menuItem, (schema, source) => ({
      ...schema,
      description: `Converted from a schema with: ${Object.keys(source).join(', ')}.`,
    }));

    expect(converted).toMatchInlineSnapshot(`
      {
        "$defs": {
          "0": {
            "description": "Converted from a schema with: type, properties, x-tags.",
            "properties": {
              "name": {
                "description": "Converted from a schema with: type.",
                "type": "string",
              },
              "related": {
                "$ref": "#/$defs/0",
              },
            },
            "type": "object",
          },
        },
        "$ref": "#/$defs/0",
      }
    `);
  });
});
