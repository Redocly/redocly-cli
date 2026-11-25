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

  it('should leave the properties that are not part of the target out of required', () => {
    // A recursive property is only a `$ref` after the conversion, and a flag can be in `allOf`.
    const properties: Record<string, unknown> = {
      name: { type: 'string' },
      id: { allOf: [{ type: 'string' }, { readOnly: true }] },
      password: { type: 'string', writeOnly: true },
    };
    const menuItem = {
      type: 'object',
      required: ['id', 'name', 'password', 'related'],
      properties,
    };
    properties.related = { ...menuItem, readOnly: true };

    expect(toAjvSchema(menuItem, { target: 'request' })).toMatchInlineSnapshot(`
      {
        "$defs": {
          "0": {
            "properties": {
              "id": {
                "allOf": [
                  {
                    "type": "string",
                  },
                  {
                    "readOnly": true,
                  },
                ],
              },
              "name": {
                "type": "string",
              },
              "password": {
                "type": "string",
                "writeOnly": true,
              },
              "related": {
                "$ref": "#/$defs/0",
              },
            },
            "readOnly": true,
            "required": [
              "name",
              "password",
            ],
            "type": "object",
          },
        },
        "properties": {
          "id": {
            "allOf": [
              {
                "type": "string",
              },
              {
                "readOnly": true,
              },
            ],
          },
          "name": {
            "type": "string",
          },
          "password": {
            "type": "string",
            "writeOnly": true,
          },
          "related": {
            "$ref": "#/$defs/0",
          },
        },
        "required": [
          "name",
          "password",
        ],
        "type": "object",
      }
    `);
  });
});
