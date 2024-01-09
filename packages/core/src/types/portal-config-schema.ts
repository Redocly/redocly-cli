import {
  ApigeeDevOnboardingIntegrationAuthType,
  AuthProviderType,
  DEFAULT_TEAM_CLAIM_NAME,
} from '../config';

import type { NodeType } from '.';

const oidcIssuerMetadataSchema = {
  type: 'object',
  properties: {
    end_session_endpoint: { type: 'string' },
    token_endpoint: { type: 'string' },
    authorization_endpoint: { type: 'string' },
    jwks_uri: { type: 'string' },
  },
  required: ['token_endpoint', 'authorization_endpoint'],
  additionalProperties: true,
} as const;

const oidcProviderConfigSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: AuthProviderType.OIDC },
    title: { type: 'string' },
    configurationUrl: { type: 'string', minLength: 1 },
    configuration: oidcIssuerMetadataSchema,
    clientId: { type: 'string', minLength: 1 },
    clientSecret: { type: 'string', minLength: 1 },
    teamsClaimName: { type: 'string' },
    teamsClaimMap: { type: 'object', additionalProperties: { type: 'string' } },
    defaultTeams: { type: 'array', items: { type: 'string' } },
    scopes: { type: 'array', items: { type: 'string' } },
    tokenExpirationTime: { type: 'number' },
    authorizationRequestCustomParams: { type: 'object', additionalProperties: { type: 'string' } },
    tokenRequestCustomParams: { type: 'object', additionalProperties: { type: 'string' } },
    audience: { type: 'array', items: { type: 'string' } },
  },
  required: ['type', 'clientId', 'clientSecret'],
  oneOf: [{ required: ['configurationUrl'] }, { required: ['configuration'] }],
  additionalProperties: false,
} as const;

const saml2ProviderConfigSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: AuthProviderType.SAML2 },
    title: { type: 'string' },
    issuerId: { type: 'string' },
    entityId: { type: 'string' },
    ssoUrl: { type: 'string' },
    x509PublicCert: { type: 'string' },
    teamsAttributeName: { type: 'string', default: DEFAULT_TEAM_CLAIM_NAME },
    teamsAttributeMap: { type: 'object', additionalProperties: { type: 'string' } },
    defaultTeams: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
  required: ['type', 'issuerId', 'ssoUrl', 'x509PublicCert'],
} as const;

const basicAuthProviderConfigSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: AuthProviderType.BASIC },
    title: { type: 'string' },
    credentials: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
          passwordHash: { type: 'string' },
          teams: { type: 'array', items: { type: 'string' } },
        },
        required: ['username'],
        additionalProperties: false,
      },
    },
  },
  required: ['type', 'credentials'],
  additionalProperties: false,
} as const;

const authProviderConfigSchema = {
  oneOf: [oidcProviderConfigSchema, saml2ProviderConfigSchema, basicAuthProviderConfigSchema],
  discriminator: { propertyName: 'type' },
} as const;

export const ssoConfigSchema = {
  type: 'object',
  properties: {},
  additionalProperties: authProviderConfigSchema,
} as NodeType;

const redirectConfigSchema = {
  type: 'object',
  properties: {
    to: { type: 'string' },
    type: { type: 'number', default: 301 },
  },
  required: ['to'],
} as NodeType;

const redirectsConfigSchema = {
  type: 'object',
  properties: {},
  additionalProperties: 'redirectConfigSchema',
  default: {},
} as NodeType;

export const apiConfigSchema = {
  type: 'object',
  properties: {
    root: { type: 'string' },
    rbac: { type: 'object', additionalProperties: true },
    theme: {
      type: 'object',
      properties: {
        openapi: { type: 'object', additionalProperties: true },
      },
      additionalProperties: false,
    },
    title: { type: 'string' },
    metadata: { type: 'object', additionalProperties: true },
  },
  additionalProperties: true,
  required: ['root'],
} as const;

const metadataConfigSchema = {
  type: 'object',
  additionalProperties: true,
} as const;

const seoConfigSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    siteUrl: { type: 'string' },
    image: { type: 'string' },
    keywords: { type: 'array', items: { type: 'string' } },
    lang: { type: 'string' },
    jsonLd: { type: 'object' },
    meta: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['name', 'content'],
        additionalProperties: false,
      },
    },
  },
} as const;

const rbacScopeItemsSchema = {
  type: 'object',
  properties: {},
  additionalProperties: { type: 'string' },
} as NodeType;

const rbacConfigSchema = {
  type: 'object',
  properties: {
    defaults: 'rbacScopeItemsSchema',
  },
  additionalProperties: rbacScopeItemsSchema,
} as NodeType;

const graviteeAdapterConfigSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'GRAVITEE' },
    apiBaseUrl: { type: 'string' },
    env: { type: 'string' },
    allowApiProductsOutsideCatalog: { type: 'boolean', default: false },
    stage: { type: 'string', default: 'non-production' },

    auth: { type: 'object', properties: { static: { type: 'string' } } },
  },
  additionalProperties: false,
  required: ['type', 'apiBaseUrl'],
} as const;

const apigeeAdapterAuthOauth2Schema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: ApigeeDevOnboardingIntegrationAuthType.OAUTH2 },
    tokenEndpoint: { type: 'string' },
    clientId: { type: 'string' },
    clientSecret: { type: 'string' },
  },
  additionalProperties: false,
  required: ['type', 'tokenEndpoint', 'clientId', 'clientSecret'],
} as const;

const apigeeAdapterAuthServiceAccountSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: ApigeeDevOnboardingIntegrationAuthType.SERVICE_ACCOUNT },
    serviceAccountEmail: { type: 'string' },
    serviceAccountPrivateKey: { type: 'string' },
  },
  additionalProperties: false,
  required: ['type', 'serviceAccountEmail', 'serviceAccountPrivateKey'],
} as const;

const apigeeXAdapterConfigSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'APIGEE_X' },
    apiUrl: { type: 'string' },
    stage: { type: 'string', default: 'non-production' },
    organizationName: { type: 'string' },
    ignoreApiProducts: { type: 'array', items: { type: 'string' } },
    allowApiProductsOutsideCatalog: { type: 'boolean', default: false },
    auth: {
      type: 'object',
      oneOf: [apigeeAdapterAuthOauth2Schema, apigeeAdapterAuthServiceAccountSchema],
      discriminator: { propertyName: 'type' },
    },
  },
  additionalProperties: false,
  required: ['type', 'organizationName', 'auth'],
} as const;

const apigeeEdgeAdapterConfigSchema = {
  ...apigeeXAdapterConfigSchema,
  properties: {
    ...apigeeXAdapterConfigSchema.properties,
    type: { type: 'string', const: 'APIGEE_EDGE' },
  },
} as const;

const devOnboardingAdapterConfigSchema = {
  type: 'object',
  oneOf: [apigeeXAdapterConfigSchema, apigeeEdgeAdapterConfigSchema, graviteeAdapterConfigSchema],
  discriminator: { propertyName: 'type' },
} as const;

const devOnboardingConfigSchema = {
  type: 'object',
  required: ['adapters'],
  properties: {
    adapters: {
      type: 'array',
      items: devOnboardingAdapterConfigSchema,
    },
  },
} as NodeType;

const i18ConfigSchema = {
  type: 'object',
  properties: {
    defaultLocale: {
      type: 'string',
    },
    locales: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
        },
        required: ['code'],
      },
    },
  },
  required: ['defaultLocale', 'locales'],
} as NodeType;

const responseHeaderSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    value: { type: 'string' },
  },
  additionalProperties: false,
  required: ['name', 'value'],
} as const;

export const PortalConfigNodeTypes: Record<string, NodeType> = {
  seoConfigSchema,
  rbacConfigSchema,
  rbacScopeItemsSchema,
  ssoConfigSchema,
  devOnboardingConfigSchema,
  i18ConfigSchema,
  redirectsConfigSchema,
  redirectConfigSchema,
  // TODO: Extract other types that need to be linted in the config
};

export const redoclyConfigSchema = {
  type: 'object',
  properties: {
    licenseKey: { type: 'string' },
    redirects: 'redirectsConfigSchema',
    seo: 'seoConfigSchema',
    rbac: 'rbacConfigSchema',
    responseHeaders: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: responseHeaderSchema,
      },
    },
    mockServer: {
      type: 'object',
      properties: {
        off: { type: 'boolean', default: false },
        position: { type: 'string', enum: ['first', 'last', 'replace', 'off'], default: 'first' },
        strictExamples: { type: 'boolean', default: false },
        errorIfForcedExampleNotFound: { type: 'boolean', default: false },
        description: { type: 'string' },
      },
    },
    apis: {
      type: 'object',
      additionalProperties: apiConfigSchema,
    },
    sso: 'ssoConfigSchema',
    developerOnboarding: 'devOnboardingConfigSchema',
    i18n: 'i18ConfigSchema',
    metadata: metadataConfigSchema,
  },
  default: {},
} as NodeType;

export const environmentSchema = {
  oneOf: [
    { ...redoclyConfigSchema, additionalProperties: false },
    {
      type: 'object',
      properties: {
        $ref: { type: 'string' },
      },
      required: ['$ref'],
      additionalProperties: false,
    },
  ],
} as const;

export const rootRedoclyConfigSchema = {
  ...redoclyConfigSchema,
  properties: {
    ...redoclyConfigSchema.properties,
    env: {
      type: 'object',
      properties: {},
      additionalProperties: environmentSchema,
    },
  },
  default: {},
  required: ['redirects'],
} as const;
