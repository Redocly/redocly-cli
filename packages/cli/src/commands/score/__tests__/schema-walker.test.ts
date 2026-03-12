import { walkSchema } from '../collectors/schema-walker.js';

describe('schema-walker', () => {
  describe('depth', () => {
    it('should return depth 0 for a flat schema with no properties', () => {
      const schema = { type: 'string' };
      expect(walkSchema(schema).depth).toBe(0);
    });

    it('should return depth 0 for null/undefined', () => {
      expect(walkSchema(null).depth).toBe(0);
      expect(walkSchema(undefined).depth).toBe(0);
    });

    it('should return depth 1 for a single level of properties', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
      };
      expect(walkSchema(schema).depth).toBe(1);
    });

    it('should return depth 2 for nested objects', () => {
      const schema = {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: {
              city: { type: 'string' },
            },
          },
        },
      };
      expect(walkSchema(schema).depth).toBe(2);
    });

    it('should return depth 3 for deeply nested schemas', () => {
      const schema = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: { type: 'string' },
                },
              },
            },
          },
        },
      };
      expect(walkSchema(schema).depth).toBe(3);
    });

    it('should count array items as depth', () => {
      const schema = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      };
      expect(walkSchema(schema).depth).toBe(2);
    });

    it('should handle circular references gracefully', () => {
      const schema: Record<string, any> = {
        type: 'object',
        properties: {},
      };
      schema.properties.self = schema;
      const result = walkSchema(schema);
      expect(result.depth).toBe(1);
    });

    it('should count additionalProperties depth', () => {
      const schema = {
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            value: { type: 'string' },
          },
        },
      };
      expect(walkSchema(schema).depth).toBe(2);
    });
  });

  describe('polymorphism counts', () => {
    it('should count oneOf schemas', () => {
      const schema = {
        oneOf: [{ type: 'string' }, { type: 'integer' }, { type: 'boolean' }],
      };
      const result = walkSchema(schema);
      expect(result.oneOfCount).toBe(3);
      expect(result.anyOfCount).toBe(0);
      expect(result.allOfCount).toBe(0);
    });

    it('should count anyOf schemas', () => {
      const schema = {
        anyOf: [{ type: 'string' }, { type: 'integer' }],
      };
      const result = walkSchema(schema);
      expect(result.anyOfCount).toBe(2);
      expect(result.oneOfCount).toBe(0);
    });

    it('should count allOf schemas', () => {
      const schema = {
        allOf: [
          { type: 'object', properties: { a: { type: 'string' } } },
          { type: 'object', properties: { b: { type: 'integer' } } },
        ],
      };
      const result = walkSchema(schema);
      expect(result.allOfCount).toBe(2);
    });

    it('should count nested polymorphism', () => {
      const schema = {
        type: 'object',
        properties: {
          field: {
            oneOf: [
              { type: 'string' },
              {
                anyOf: [{ type: 'integer' }, { type: 'boolean' }],
              },
            ],
          },
        },
      };
      const result = walkSchema(schema);
      expect(result.oneOfCount).toBe(2);
      expect(result.anyOfCount).toBe(2);
    });

    it('should detect discriminator', () => {
      const schema = {
        oneOf: [
          { type: 'object', properties: { kind: { type: 'string' } } },
          { type: 'object', properties: { kind: { type: 'string' } } },
        ],
        discriminator: { propertyName: 'kind' },
      };
      const result = walkSchema(schema);
      expect(result.hasDiscriminator).toBe(true);
    });

    it('should not report discriminator when missing', () => {
      const schema = {
        oneOf: [{ type: 'string' }, { type: 'integer' }],
      };
      expect(walkSchema(schema).hasDiscriminator).toBe(false);
    });
  });

  describe('property counting and description coverage', () => {
    it('should count properties', () => {
      const schema = {
        type: 'object',
        properties: {
          a: { type: 'string' },
          b: { type: 'integer' },
          c: { type: 'boolean' },
        },
      };
      const result = walkSchema(schema);
      expect(result.propertyCount).toBe(3);
      expect(result.totalProperties).toBe(3);
    });

    it('should count properties with descriptions', () => {
      const schema = {
        type: 'object',
        properties: {
          a: { type: 'string', description: 'First field' },
          b: { type: 'integer' },
          c: { type: 'boolean', description: 'Third field' },
        },
      };
      const result = walkSchema(schema);
      expect(result.propertiesWithDescription).toBe(2);
    });
  });

  describe('constraint counting', () => {
    it('should count enum as a constraint', () => {
      const schema = { type: 'string', enum: ['a', 'b', 'c'] };
      expect(walkSchema(schema).constraintCount).toBe(1);
    });

    it('should count format as a constraint', () => {
      const schema = { type: 'string', format: 'email' };
      expect(walkSchema(schema).constraintCount).toBe(1);
    });

    it('should count multiple constraints', () => {
      const schema = {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        pattern: '^[a-z]+$',
        format: 'email',
      };
      expect(walkSchema(schema).constraintCount).toBe(4);
    });

    it('should count numeric constraints', () => {
      const schema = {
        type: 'integer',
        minimum: 0,
        maximum: 100,
        multipleOf: 5,
      };
      expect(walkSchema(schema).constraintCount).toBe(3);
    });
  });

  describe('$ref resolution', () => {
    it('should resolve $ref schemas via resolveRef', () => {
      const components = {
        Address: {
          type: 'object',
          properties: {
            city: { type: 'string', description: 'City name' },
            zip: { type: 'string', pattern: '^[0-9]{5}$' },
          },
        },
      };
      const resolveRef = (ref: string) => {
        if (ref === '#/components/schemas/Address') return components.Address;
        return undefined;
      };

      const schema = { $ref: '#/components/schemas/Address' };
      const result = walkSchema(schema, resolveRef);
      expect(result.depth).toBe(1);
      expect(result.propertyCount).toBe(2);
      expect(result.propertiesWithDescription).toBe(1);
      expect(result.constraintCount).toBe(1);
    });

    it('should resolve nested $ref in properties', () => {
      const components = {
        Name: { type: 'string', minLength: 1 },
      };
      const resolveRef = (ref: string) => {
        if (ref === '#/components/schemas/Name') return components.Name;
        return undefined;
      };

      const schema = {
        type: 'object',
        properties: {
          name: { $ref: '#/components/schemas/Name' },
          age: { type: 'integer' },
        },
      };
      const result = walkSchema(schema, resolveRef);
      expect(result.propertyCount).toBe(2);
      expect(result.constraintCount).toBe(1);
    });
  });

  describe('const constraint', () => {
    it('should count const as a constraint', () => {
      const schema = { type: 'string', const: 'fixed' };
      expect(walkSchema(schema).constraintCount).toBe(1);
    });
  });

  describe('property-level examples', () => {
    it('should count properties with example keyword', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'abc123' },
          name: { type: 'string' },
        },
      };
      const result = walkSchema(schema);
      expect(result.propertiesWithExamples).toBe(1);
    });

    it('should count properties with examples keyword', () => {
      const schema = {
        type: 'object',
        properties: {
          status: { type: 'string', examples: ['active', 'inactive'] },
          name: { type: 'string' },
        },
      };
      const result = walkSchema(schema);
      expect(result.propertiesWithExamples).toBe(1);
    });
  });

  describe('writable fields', () => {
    it('should count writable top-level fields', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string', readOnly: true },
          name: { type: 'string' },
          email: { type: 'string' },
        },
      };
      const result = walkSchema(schema);
      expect(result.writableTopLevelFieldCount).toBe(2);
    });

    it('should count all fields as writable when none are readOnly', () => {
      const schema = {
        type: 'object',
        properties: {
          a: { type: 'string' },
          b: { type: 'string' },
        },
      };
      expect(walkSchema(schema).writableTopLevelFieldCount).toBe(2);
    });
  });
});
