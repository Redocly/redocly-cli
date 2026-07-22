import { SchemaValidator } from '../../../commands/drift/engine/schema-validator.js';

const idPattern = '^idp_[0-9abcdefghjkmnpqrstvwxyz]{26}$';

const identityProviderSchema = {
  oneOf: [
    {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['OPENID'] },
        id: { type: 'string', pattern: idPattern },
        clientId: { type: 'string' },
        issuer: { type: 'string' },
      },
      required: ['type', 'clientId', 'issuer'],
    },
    {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['SAML2'] },
        id: { type: 'string', pattern: idPattern },
        ssoUrl: { type: 'string' },
        certificate: { type: ['string', 'null'] },
      },
      required: ['type', 'ssoUrl'],
    },
  ],
  discriminator: {
    propertyName: 'type',
    mapping: {
      OPENID: './OpenIDIdentityProvider.yaml',
      SAML2: './SAML2IdentityProvider.yaml',
    },
  },
};

const validSaml2Provider = {
  type: 'SAML2',
  id: 'idp_0123456789abcdefghjkmnpqrs',
  ssoUrl: 'https://sso.example.com',
  certificate: null,
};

describe('SchemaValidator discriminated oneOf', () => {
  const validator = new SchemaValidator();

  it('reports no errors for a response that matches its discriminated branch', () => {
    const result = validator.validate(identityProviderSchema, validSaml2Provider, 'response');

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('reports only the selected branch errors instead of noise from every oneOf branch', () => {
    const providerWithInvalidId = { ...validSaml2Provider, id: 'IDP-123' };

    const result = validator.validate(identityProviderSchema, providerWithInvalidId, 'response');

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ keyword: 'pattern', instancePath: '/id' });
  });

  it('falls back to validating without discriminator support when Ajv cannot compile it', () => {
    const looseDiscriminatorSchema = {
      oneOf: [
        {
          type: 'object',
          properties: { type: { type: 'string' }, clientId: { type: 'string' } },
          required: ['type', 'clientId'],
        },
        {
          type: 'object',
          properties: { type: { type: 'string' }, ssoUrl: { type: 'string' } },
          required: ['type', 'ssoUrl'],
        },
      ],
      discriminator: { propertyName: 'type' },
    };

    const result = validator.validate(
      looseDiscriminatorSchema,
      { type: 'SAML2', ssoUrl: 'https://sso.example.com' },
      'response'
    );

    expect(result).toEqual({ valid: true, errors: [] });
  });
});
