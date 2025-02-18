import { checkCircularRefsInSchema } from '../check-circular-refs-in-schema';

describe('checkCircularRefsInSchema', () => {
  it('should return false if schema is not circular', () => {
    const schema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
    };

    expect(checkCircularRefsInSchema(schema)).toBe(false);
  });

  it('should return true if schema is circular', () => {
    const schema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
    };

    schema.properties.name = schema;

    expect(checkCircularRefsInSchema(schema)).toBe(true);
  });
});
