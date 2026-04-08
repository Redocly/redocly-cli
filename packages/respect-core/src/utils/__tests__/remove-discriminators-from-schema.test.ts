import { removeDiscriminatorsFromSchema } from '../remove-discriminators-from-schema.js';

describe('removeDiscriminatorsFromSchema', () => {
  it('should return schema unchanged when no discriminator is present', () => {
    const schema = {
      type: 'object',
      properties: {
        method: { type: 'string' },
      },
    };
    expect(removeDiscriminatorsFromSchema(schema)).toEqual(schema);
  });

  it('should remove top-level discriminator', () => {
    const schema = {
      oneOf: [{ properties: { method: { const: 'card' } } }],
      discriminator: { propertyName: 'method' },
    };
    const result = removeDiscriminatorsFromSchema(schema);
    expect(result).not.toHaveProperty('discriminator');
    expect(result.oneOf).toBeDefined();
  });

  it('should remove nested discriminators', () => {
    const schema = {
      properties: {
        instrument: {
          oneOf: [{ properties: { method: { const: 'card' } } }],
          discriminator: { propertyName: 'method' },
        },
      },
    };
    const result = removeDiscriminatorsFromSchema(schema);
    expect(result.properties.instrument).not.toHaveProperty('discriminator');
  });

  it('should handle allOf + not pattern (the discriminator bug case)', () => {
    const schema = {
      oneOf: [
        {
          properties: {
            method: {
              allOf: [
                { enum: ['cash', 'payment-card', 'paypal', 'ach'] },
                { not: { enum: ['payment-card', 'paypal', 'ach'] } },
              ],
            },
          },
        },
        {
          properties: {
            method: { const: 'payment-card' },
          },
        },
      ],
      discriminator: { propertyName: 'method' },
    };
    const result = removeDiscriminatorsFromSchema(schema);
    expect(result).not.toHaveProperty('discriminator');
    expect(result.oneOf).toHaveLength(2);
    expect(result.oneOf[0].properties.method.allOf).toBeDefined();
  });

  it('should not mutate the original schema', () => {
    const schema = {
      oneOf: [{ properties: { method: { const: 'card' } } }],
      discriminator: { propertyName: 'method' },
    };
    removeDiscriminatorsFromSchema(schema);
    expect(schema).toHaveProperty('discriminator');
  });

  it('should handle null and non-object values gracefully', () => {
    expect(removeDiscriminatorsFromSchema(null)).toBeNull();
    expect(removeDiscriminatorsFromSchema('string')).toBe('string');
    expect(removeDiscriminatorsFromSchema(42)).toBe(42);
  });
});
