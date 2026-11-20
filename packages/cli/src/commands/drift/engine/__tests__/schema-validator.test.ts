import { SchemaValidator } from '../schema-validator.js';

const idPattern = '^pay_[0-9a-f]{12}$';

const paymentSchema = {
  oneOf: [
    {
      type: 'object',
      properties: {
        method: { type: 'string', enum: ['CARD'] },
        id: { type: 'string', pattern: idPattern },
        cardNumber: { type: 'string' },
        expiryMonth: { type: 'integer' },
      },
      required: ['method', 'cardNumber', 'expiryMonth'],
    },
    {
      type: 'object',
      properties: {
        method: { type: 'string', enum: ['BANK_TRANSFER'] },
        id: { type: 'string', pattern: idPattern },
        iban: { type: 'string' },
        reference: { type: ['string', 'null'] },
      },
      required: ['method', 'iban'],
    },
  ],
  discriminator: {
    propertyName: 'method',
    mapping: {
      CARD: './CardPayment.yaml',
      BANK_TRANSFER: './BankTransferPayment.yaml',
    },
  },
};

const validBankTransferPayment = {
  method: 'BANK_TRANSFER',
  id: 'pay_0123456789ab',
  iban: 'DE89370400440532013000',
  reference: null,
};

describe('SchemaValidator discriminated oneOf', () => {
  const validator = new SchemaValidator();

  it('reports no errors for a response that matches its discriminated branch', () => {
    const result = validator.validate(paymentSchema, validBankTransferPayment, 'response');

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('reports only the selected branch errors instead of noise from every oneOf branch', () => {
    const paymentWithInvalidId = { ...validBankTransferPayment, id: 'PAY-123' };

    const result = validator.validate(paymentSchema, paymentWithInvalidId, 'response');

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ keyword: 'pattern', instancePath: '/id' });
  });

  it('reports a single error when the discriminator value matches no branch', () => {
    const paymentWithUnknownMethod = { ...validBankTransferPayment, method: 'CHECK' };

    const result = validator.validate(paymentSchema, paymentWithUnknownMethod, 'response');

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ keyword: 'discriminator', instancePath: '' });
  });

  it('falls back to validating without discriminator support when Ajv cannot compile it', () => {
    const looseDiscriminatorSchema = {
      oneOf: [
        {
          type: 'object',
          properties: { method: { type: 'string' }, cardNumber: { type: 'string' } },
          required: ['method', 'cardNumber'],
        },
        {
          type: 'object',
          properties: { method: { type: 'string' }, iban: { type: 'string' } },
          required: ['method', 'iban'],
        },
      ],
      discriminator: { propertyName: 'method' },
    };

    const result = validator.validate(
      looseDiscriminatorSchema,
      { method: 'BANK_TRANSFER', iban: 'DE89370400440532013000' },
      'response'
    );

    expect(result).toEqual({ valid: true, errors: [] });
  });
});

describe('SchemaValidator readOnly and writeOnly through allOf', () => {
  const validator = new SchemaValidator();
  const schema = {
    type: 'object',
    required: ['id', 'name'],
    properties: {
      id: { allOf: [{ type: 'string' }, { readOnly: true }] },
      name: { type: 'string' },
    },
  };

  it('does not require a readOnly property in a request', () => {
    expect(validator.validate(schema, { name: 'Dune' }, 'request').errors).toEqual([]);
  });

  it('still requires the property in a response', () => {
    expect(validator.validate(schema, { name: 'Dune' }, 'response').valid).toBe(false);
  });
});

describe('SchemaValidator decimal multipleOf', () => {
  const validator = new SchemaValidator();
  const schema = { type: 'object', properties: { percent: { type: 'number', multipleOf: 0.1 } } };

  it('accepts a decimal value that is a multiple of a decimal multipleOf', () => {
    expect(validator.validate(schema, { percent: 98.8 }, 'response').errors).toEqual([]);
  });

  it('still reports a decimal value that is not a multiple', () => {
    expect(validator.validate(schema, { percent: 98.85 }, 'response').valid).toBe(false);
  });
});

describe('SchemaValidator recursive schema', () => {
  const validator = new SchemaValidator();
  const menu = { name: 'Menu', sections: [{ name: 'Drinks', sections: [{ name: 42 }] }] };
  const wrongNameAtThirdLevel = {
    valid: false,
    errors: [{ keyword: 'type', instancePath: '/sections/0/sections/0/name' }],
  };

  it.each([undefined, 'request', 'response'] as const)(
    'reports a wrong value at the third level, target: %s',
    (target) => {
      // A dereferenced `$ref` is a copy of its target, so the copy shares `properties` with the target.
      const properties: Record<string, unknown> = { name: { type: 'string' } };
      const menuSection = { type: 'object', required: ['name'], properties };
      properties.sections = { type: 'array', items: { ...menuSection } };

      expect(validator.validate(menuSection, menu, target)).toMatchObject(wrongNameAtThirdLevel);
    }
  );

  it('does not require a readOnly recursive property in a request at any level', () => {
    const properties: Record<string, unknown> = { name: { type: 'string' } };
    const menuSection = { type: 'object', required: ['name', 'parent'], properties };
    properties.parent = { ...menuSection, readOnly: true };
    properties.sections = { type: 'array', items: { ...menuSection } };

    expect(validator.validate(menuSection, menu, 'request')).toMatchObject(wrongNameAtThirdLevel);
  });
});

describe('SchemaValidator discriminator with many values', () => {
  const validator = new SchemaValidator();
  const methods = Array.from({ length: 150 }, (_, index) => `method-${index}`);
  const createInstrument = (properties: Record<string, unknown>) => ({
    discriminator: { propertyName: 'method' },
    anyOf: [
      {
        type: 'object',
        required: ['method'],
        properties: { method: { type: 'string', enum: methods }, ...properties },
      },
    ],
  });

  // Ajv writes the code of an inlined variant once per value, which makes the validation function
  // of the schemas below too large to run.
  it('validates a value against nested discriminators', () => {
    const instrument = createInstrument({ backup: createInstrument({ id: { type: 'string' } }) });

    const result = validator.validate(
      instrument,
      { method: 'method-7', backup: { method: 'method-3', id: 42 } },
      'response'
    );

    expect(result).toMatchObject({
      valid: false,
      errors: [{ keyword: 'type', instancePath: '/backup/id' }],
    });
  });

  it('validates a value against a variant with many properties', () => {
    const instrument = createInstrument(
      Object.fromEntries(
        Array.from({ length: 600 }, (_, index) => [`detail-${index}`, { type: 'string' }])
      )
    );

    const result = validator.validate(
      instrument,
      { method: 'method-3', 'detail-7': 42 },
      'response'
    );

    expect(result).toMatchObject({
      valid: false,
      errors: [{ keyword: 'type', instancePath: '/detail-7' }],
    });
  });
});
