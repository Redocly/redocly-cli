import {
  ApigeeDevOnboardingIntegrationAuthType,
  AuthProviderType,
  DEFAULT_TEAM_CLAIM_NAME,
} from '../config';
import { transformJSONSchemaToNodeType } from './json-schema-adapter';
import { themeConfigSchema } from './theme-config';

import type { FromSchema } from 'json-schema-to-ts';
import type { NodeType } from '.';
import type { ThemeConfig } from './theme-config';

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

const ssoOnPremConfigSchema = {
  type: 'object',
  additionalProperties: authProviderConfigSchema,
} as const;

const ssoConfigSchema = {
  oneOf: [
    {
      type: 'array',
      items: {
        type: 'string',
        enum: ['REDOCLY', 'CORPORATE', 'GUEST'],
      },
      uniqueItems: true,
    },
    {
      type: 'string',
      enum: ['REDOCLY', 'CORPORATE', 'GUEST'],
    },
  ],
} as const;

const redirectConfigSchema = {
  type: 'object',
  properties: {
    to: { type: 'string' },
    type: { type: 'number', default: 301 },
  },
  additionalProperties: false,
} as const;

const redirectsConfigSchema = {
  type: 'object',
  additionalProperties: redirectConfigSchema,
  default: {},
} as const;

const apiConfigSchema = {
  type: 'object',
  properties: {
    root: { type: 'string' },
    output: { type: 'string', pattern: '(.ya?ml|.json)$' },
    rbac: { type: 'object', additionalProperties: true },
    theme: {
      type: 'object',
      properties: {
        openapi: themeConfigSchema.properties.openapi,
        graphql: themeConfigSchema.properties.graphql, // TODO: should it be here?
      },
      additionalProperties: false,
    },
    title: { type: 'string' },
    metadata: { type: 'object', additionalProperties: true },
    rules: { type: 'object', additionalProperties: true }, // FIXME: either add this here or uncomment `additionalProperties: true`
  },
  // additionalProperties: true, // FIXME: do we need this?
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
    keywords: {
      oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'string' }],
    },
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
  additionalProperties: false,
} as const;

const rbacScopeItemsSchema = { type: 'object', additionalProperties: { type: 'string' } } as const;

const rbacConfigSchema = {
  type: 'object',
  properties: {
    cms: rbacScopeItemsSchema,
    content: {
      type: 'object',
      properties: {
        '**': rbacScopeItemsSchema,
      },
      additionalProperties: rbacScopeItemsSchema,
    },
  },
  additionalProperties: rbacScopeItemsSchema,
} as const;

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
  additionalProperties: false,
  properties: {
    // adapters: {
    //   type: 'array',
    //   items: devOnboardingAdapterConfigSchema,
    // }, // TODO: figure out how to make oneOf work with arrays
    adapters: {
      oneOf: [
        {
          type: 'array',
          items: apigeeXAdapterConfigSchema,
        },
        {
          type: 'array',
          items: apigeeEdgeAdapterConfigSchema,
        },
        {
          type: 'array',
          items: graviteeAdapterConfigSchema,
        },
      ],
    },
  },
} as const;

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
  additionalProperties: false,
  required: ['defaultLocale'],
} as const;

const responseHeaderSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    value: { type: 'string' },
  },
  additionalProperties: false,
  required: ['name', 'value'],
} as const;

const redoclyConfigSchema = {
  type: 'object',
  properties: {
    licenseKey: { type: 'string' },
    redirects: redirectsConfigSchema,
    seo: seoConfigSchema,
    rbac: rbacConfigSchema,
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
    ssoOnPrem: ssoOnPremConfigSchema,
    sso: ssoConfigSchema,
    residency: { type: 'string' },
    developerOnboarding: devOnboardingConfigSchema,
    i18n: i18ConfigSchema,
    metadata: metadataConfigSchema,
    ignore: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    theme: themeConfigSchema,
  },
  default: { redirects: {} },
  additionalProperties: false,
} as const;

const environmentSchema = {
  ...redoclyConfigSchema,
  additionalProperties: false,
} as const;

export const rootRedoclyConfigSchema = {
  ...redoclyConfigSchema,
  properties: {
    plugins: {
      type: 'array',
      items: { type: 'string' },
    },
    ...redoclyConfigSchema.properties,
    env: {
      type: 'object',
      additionalProperties: environmentSchema, // TODO: if we want full valiadation we need to override apis, theme and the root
    },
  },
  default: {},
  // required: ['redirects'], // FIXME: why redirects is required?
} as const;

export type RedoclyConfig<T = ThemeConfig> = FromSchema<typeof rootRedoclyConfigSchema> & {
  theme?: T;
};
export type RedirectConfig = FromSchema<typeof redirectConfigSchema>;
export type RedirectsConfig = FromSchema<typeof redirectsConfigSchema>;

export type AuthProviderConfig = FromSchema<typeof authProviderConfigSchema>;
export type BasicAuthProviderConfig = FromSchema<typeof basicAuthProviderConfigSchema>;
export type OidcProviderConfig = FromSchema<typeof oidcProviderConfigSchema>;
export type Saml2ProviderConfig = FromSchema<typeof saml2ProviderConfigSchema>;
export type SeoConfig = FromSchema<typeof seoConfigSchema>;
export type RbacConfig = FromSchema<typeof rbacConfigSchema>;
export type RbacScopeItems = FromSchema<typeof rbacScopeItemsSchema>;
export type OidcIssuerMetadata = FromSchema<typeof oidcIssuerMetadataSchema>;

export type DevOnboardingAdapterConfig = FromSchema<typeof devOnboardingAdapterConfigSchema>;
export type GraviteeAdapterConfig = FromSchema<typeof graviteeAdapterConfigSchema>;
export type ApigeeAdapterConfig = FromSchema<
  typeof apigeeXAdapterConfigSchema | typeof apigeeEdgeAdapterConfigSchema
>;
export type ApigeeAdapterAuthOauth2 = FromSchema<typeof apigeeAdapterAuthOauth2Schema>;
export type ApigeeAdapterAuthServiceAccount = FromSchema<
  typeof apigeeAdapterAuthServiceAccountSchema
>;
export type SsoConfig = FromSchema<typeof ssoOnPremConfigSchema>;
export type I18nConfig = FromSchema<typeof i18ConfigSchema>;

export type ApiConfig = FromSchema<typeof apiConfigSchema>;

export const DefaultPortalConfigNodeTypes: Record<string, NodeType> = {};

transformJSONSchemaToNodeType(
  'rootRedoclyConfigSchema',
  rootRedoclyConfigSchema,
  DefaultPortalConfigNodeTypes
);

// console.log(JSON.stringify(DefaultPortalConfigNodeTypes, null, 2));
