import { SchemaValidator } from '../../../commands/drift/engine/schema-validator.js';

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
