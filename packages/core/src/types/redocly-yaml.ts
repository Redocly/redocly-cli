import { NodeType, listOf } from '.';
import { omitObjectProps, pickObjectProps, isCustomRuleId } from '../utils';
import {
  ApigeeDevOnboardingIntegrationAuthType,
  AuthProviderType,
  DEFAULT_TEAM_CLAIM_NAME,
} from '../config';

const builtInRulesList = [
  'spec',
  'info-contact',
  'info-license',
  'info-license-url',
  'operation-2xx-response',
  'operation-4xx-response',
  'operation-4xx-problem-details-rfc7807',
  'assertions',
  'operation-operationId-unique',
  'operation-parameters-unique',
  'path-parameters-defined',
  'operation-tag-defined',
  'no-example-value-and-externalValue',
  'no-enum-type-mismatch',
  'no-path-trailing-slash',
  'no-empty-servers',
  'path-declaration-must-exist',
  'operation-operationId-url-safe',
  'operation-operationId',
  'operation-summary',
  'tags-alphabetical',
  'no-server-example.com',
  'no-server-trailing-slash',
  'tag-description',
  'operation-description',
  'no-unused-components',
  'path-not-include-query',
  'path-params-defined',
  'parameter-description',
  'operation-singular-tag',
  'security-defined',
  'no-unresolved-refs',
  'paths-kebab-case',
  'boolean-parameter-prefixes',
  'path-http-verbs-order',
  'no-invalid-media-type-examples',
  'no-identical-paths',
  'no-ambiguous-paths',
  'no-undefined-server-variable',
  'no-server-variables-empty-enum',
  'no-http-verbs-in-paths',
  'path-excludes-patterns',
  'request-mime-type',
  'response-mime-type',
  'path-segment-plural',
  'no-invalid-schema-examples',
  'no-invalid-parameter-examples',
  'response-contains-header',
  'response-contains-property',
  'scalar-property-missing-example',
  'spec-components-invalid-map-name',
  'required-string-property-missing-min-length',
  'spec-strict-refs',
];
const nodeTypesList = [
  'any',
  'Root',
  'Tag',
  'TagList',
  'ExternalDocs',
  'Server',
  'ServerList',
  'ServerVariable',
  'ServerVariablesMap',
  'SecurityRequirement',
  'SecurityRequirementList',
  'Info',
  'Contact',
  'License',
  'Paths',
  'PathItem',
  'Parameter',
  'ParameterList',
  'Operation',
  'Callback',
  'CallbacksMap',
  'RequestBody',
  'MediaTypesMap',
  'MediaType',
  'Example',
  'ExamplesMap',
  'Encoding',
  'EncodingMap',
  'Header',
  'HeadersMap',
  'Responses',
  'Response',
  'Link',
  'LinksMap',
  'Schema',
  'Xml',
  'SchemaProperties',
  'DiscriminatorMapping',
  'Discriminator',
  'Components',
  'NamedSchemas',
  'NamedResponses',
  'NamedParameters',
  'NamedExamples',
  'NamedRequestBodies',
  'NamedHeaders',
  'NamedSecuritySchemes',
  'NamedLinks',
  'NamedCallbacks',
  'ImplicitFlow',
  'PasswordFlow',
  'ClientCredentials',
  'AuthorizationCode',
  'OAuth2Flows',
  'SecurityScheme',
  'XCodeSample',
  'XCodeSampleList',
  'WebhooksMap',
  'SpecExtension',
];

const ConfigStyleguide: NodeType = {
  properties: {
    extends: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    rules: 'Rules',
    oas2Rules: 'Rules',
    oas3_0Rules: 'Rules',
    oas3_1Rules: 'Rules',
    preprocessors: { type: 'object' },
    oas2Preprocessors: { type: 'object' },
    oas3_0Preprocessors: { type: 'object' },
    oas3_1Preprocessors: { type: 'object' },
    decorators: { type: 'object' },
    oas2Decorators: { type: 'object' },
    oas3_0Decorators: { type: 'object' },
    oas3_1Decorators: { type: 'object' },
  },
};

export const RootConfigStyleguide: NodeType = {
  properties: {
    plugins: {
      type: 'array',
      items: { type: 'string' },
    },
    ...ConfigStyleguide.properties,
  },
};

const oidcIssuerMetadataSchema = {
  type: 'object',
  properties: {
    end_session_endpoint: { type: 'string' },
    token_endpoint: { type: 'string' },
    authorization_endpoint: { type: 'string' },
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
    defaultTeams: { type: 'array', items: { type: 'string' } },
    scopes: { type: 'array', items: { type: 'string' } },
    tokenExpirationTime: { type: 'number' },
    authorizationRequestCustomParams: { type: 'object', additionalProperties: { type: 'string' } },
    tokenRequestCustomParams: { type: 'object', additionalProperties: { type: 'string' } },
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

const ssoConfigSchema = {
  type: 'object',
  additionalProperties: authProviderConfigSchema,
} as const;

const redirectConfigSchema = {
  type: 'object',
  properties: {
    to: { type: 'string' },
    type: { type: 'number', default: 301 },
  },
  required: ['to'],
  additionalProperties: false,
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
  additionalProperties: false,
} as const;

const rbacScopeItemsSchema = { type: 'object', additionalProperties: { type: 'string' } } as const;

const rbacConfigSchema = {
  type: 'object',
  properties: {
    defaults: rbacScopeItemsSchema,
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
    adapters: {
      type: 'array',
      items: devOnboardingAdapterConfigSchema,
    },
  },
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

const scorecardConfigSchema = {
  type: 'object',
  additionalProperties: true,
  required: ['levels'],
  properties: {
    levels: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          extends: { type: 'array', items: { type: 'string' } },
          rules: {
            type: 'object',
            additionalProperties: {
              type: ['object', 'string'],
            },
          },
        },
        additionalProperties: false,
      },
    },
    targets: {
      type: 'array',
      items: {
        type: 'object',
        required: ['where'],
        properties: {
          minimumLevel: { type: 'string' },
          where: {
            type: 'object',
            required: ['metadata'],
            properties: {
              metadata: { type: 'object', additionalProperties: { type: 'string' } },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    },
  },
} as const;

const i18nConfigSchema = {
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
} as const;

const mockServerConfigSchema = {
  type: 'object',
  properties: {
    off: { type: 'boolean', default: false },
    position: { type: 'string', enum: ['first', 'last', 'replace', 'off'], default: 'first' },
    strictExamples: { type: 'boolean', default: false },
    errorIfForcedExampleNotFound: { type: 'boolean', default: false },
    description: { type: 'string' },
  },
} as const;

const ConfigApis: NodeType = {
  properties: {},
  additionalProperties: 'ConfigApisProperties',
};

const ConfigApisProperties: NodeType = {
  properties: {
    root: { type: 'string' },
    labels: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    lint: 'ConfigStyleguide', // deprecated
    styleguide: 'ConfigStyleguide', // deprecated
    ...ConfigStyleguide.properties,
    'features.openapi': 'ConfigReferenceDocs', // deprecated
    'features.mockServer': 'ConfigMockServer', // deprecated
    theme: 'ConfigRootTheme',
    files: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  required: ['root'],
};

const ConfigHTTP: NodeType = {
  properties: {
    headers: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
};

const logoConfigSchema = {
  type: 'object',
  properties: {
    image: { type: 'string' },
    altText: { type: 'string' },
    link: { type: 'string' },
    favicon: { type: 'string' },
  },
  additionalProperties: false,
} as const;

const adobeAnalyticsConfigSchema = {
  type: 'object',
  properties: {
    includeInDevelopment: { type: 'boolean' },
    scriptUrl: { type: 'string' },
    pageViewEventName: { type: 'string' },
  },
  additionalProperties: false,
  required: ['scriptUrl'],
} as const;

const navItemSchema = {
  type: 'object',
  properties: {
    page: { type: 'string' },
    directory: { type: 'string' },
    group: { type: 'string' },
    label: { type: 'string' },
    separator: { type: 'string' },
    separatorLine: { type: 'boolean' },
    version: { type: 'string' },
    menuStyle: { type: 'string', enum: ['drilldown'] },
    expanded: { type: 'string', const: 'always' },
    selectFirstItemOnExpand: { type: 'boolean' },
    flatten: { type: 'boolean' },
    linkedSidebars: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const;

const navItemsSchema = {
  type: 'array',
  items: {
    ...navItemSchema,
    properties: {
      ...navItemSchema.properties,
      items: { type: 'array', items: navItemSchema },
    },
  },
} as const;

const hideConfigSchema = {
  type: 'object',
  properties: {
    hide: { type: 'boolean' },
  },
  additionalProperties: false,
} as const;

const scriptConfigSchema = {
  type: 'object',
  properties: {
    src: { type: 'string' },
    async: { type: 'boolean' },
    crossorigin: { type: 'string' },
    defer: { type: 'boolean' },
    fetchpriority: { type: 'string' },
    integrity: { type: 'string' },
    module: { type: 'boolean' },
    nomodule: { type: 'boolean' },
    nonce: { type: 'string' },
    referrerpolicy: { type: 'string' },
    type: { type: 'string' },
  },
  required: ['src'],
  additionalProperties: true,
} as const;

const linksConfigSchema = {
  type: 'object',
  properties: {
    href: { type: 'string' },
    as: { type: 'string' },
    crossorigin: { type: 'string' },
    fetchpriority: { type: 'string' },
    hreflang: { type: 'string' },
    imagesizes: { type: 'string' },
    imagesrcset: { type: 'string' },
    integrity: { type: 'string' },
    media: { type: 'string' },
    prefetch: { type: 'string' },
    referrerpolicy: { type: 'string' },
    rel: { type: 'string' },
    sizes: { type: 'string' },
    title: { type: 'string' },
    type: { type: 'string' },
  },
  required: ['href'],
  additionalProperties: true,
} as const;

const suggestedPageSchema = {
  type: 'object',
  properties: {
    page: { type: 'string' },
    label: { type: 'string' },
    labelTranslationKey: { type: 'string' },
  },
  required: ['page'],
} as const;

const markdownConfigSchema = {
  type: 'object',
  properties: {
    frontMatterKeysToResolve: {
      type: 'array',
      items: { type: 'string' },
      default: ['image', 'links'],
    },
    lastUpdatedBlock: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['timeago', 'iso', 'long', 'short'],
          default: 'timeago',
        },
        locale: { type: 'string', default: 'en-US' },
        ...hideConfigSchema.properties,
      },
      additionalProperties: false,
      default: {},
    },
    toc: {
      type: 'object',
      properties: {
        header: { type: 'string', default: 'On this page' },
        depth: { type: 'number', default: 3 },
        ...hideConfigSchema.properties,
      },
      additionalProperties: false,
      default: {},
    },
    editPage: {
      type: 'object',
      properties: {
        baseUrl: { type: 'string' },
        icon: { type: 'string' },
        text: { type: 'string', default: 'Edit this page' },
        ...hideConfigSchema.properties,
      },
      additionalProperties: false,
      default: {},
    },
  },
  additionalProperties: false,
  default: {},
} as const;

const amplitudeAnalyticsConfigSchema = {
  type: 'object',
  properties: {
    includeInDevelopment: { type: 'boolean' },
    apiKey: { type: 'string' },
    head: { type: 'boolean' },
    respectDNT: { type: 'boolean' },
    exclude: { type: 'array', items: { type: 'string' } },
    outboundClickEventName: { type: 'string' },
    pageViewEventName: { type: 'string' },
    amplitudeConfig: { type: 'object', additionalProperties: true },
  },
  additionalProperties: false,
  required: ['apiKey'],
} as const;

const fullstoryAnalyticsConfigSchema = {
  type: 'object',
  properties: {
    includeInDevelopment: { type: 'boolean' },
    orgId: { type: 'string' },
  },
  additionalProperties: false,
  required: ['orgId'],
} as const;

const heapAnalyticsConfigSchema = {
  type: 'object',
  properties: {
    includeInDevelopment: { type: 'boolean' },
    appId: { type: 'string' },
  },
  additionalProperties: false,
  required: ['appId'],
} as const;

const rudderstackAnalyticsConfigSchema = {
  type: 'object',
  properties: {
    includeInDevelopment: { type: 'boolean' },
    writeKey: { type: 'string', minLength: 10 },
    trackPage: { type: 'boolean' },
    dataPlaneUrl: { type: 'string' },
    controlPlaneUrl: { type: 'string' },
    sdkUrl: { type: 'string' },
    loadOptions: { type: 'object', additionalProperties: true },
  },
  additionalProperties: false,
  required: ['writeKey'],
} as const;

const segmentAnalyticsConfigSchema = {
  type: 'object',
  properties: {
    includeInDevelopment: { type: 'boolean' },
    writeKey: { type: 'string', minLength: 10 },
    trackPage: { type: 'boolean' },
    includeTitleInPageCall: { type: 'boolean' },
    host: { type: 'string' },
  },
  additionalProperties: false,
  required: ['writeKey'],
} as const;

const gtmAnalyticsConfigSchema = {
  type: 'object',
  properties: {
    includeInDevelopment: { type: 'boolean' },
    trackingId: { type: 'string' },
    gtmAuth: { type: 'string' },
    gtmPreview: { type: 'string' },
    defaultDataLayer: {},
    dataLayerName: { type: 'string' },
    enableWebVitalsTracking: { type: 'boolean' },
    selfHostedOrigin: { type: 'string' },
    pageViewEventName: { type: 'string' },
  },
  additionalProperties: false,
  required: ['trackingId'],
} as const;

const googleAnalyticsConfigSchema = {
  type: 'object',
  properties: {
    includeInDevelopment: { type: 'boolean' },
    trackingId: { type: 'string' },
    head: { type: 'boolean' },
    respectDNT: { type: 'boolean' },
    anonymize: { type: 'boolean' },
    exclude: { type: 'array', items: { type: 'string' } },
    optimizeId: { type: 'string' },
    experimentId: { type: 'string' },
    variationId: { type: 'string' },
    enableWebVitalsTracking: { type: 'boolean' },

    defer: { type: 'boolean' },
    sampleRate: { type: 'number' },
    name: { type: 'string' },
    clientId: { type: 'string' },
    siteSpeedSampleRate: { type: 'number' },
    alwaysSendReferrer: { type: 'boolean' },
    allowAnchor: { type: 'boolean' },
    cookieName: { type: 'string' },
    cookieFlags: { type: 'string' },
    cookieDomain: { type: 'string' },
    cookieExpires: { type: 'number' },
    storeGac: { type: 'boolean' },
    legacyCookieDomain: { type: 'string' },
    legacyHistoryImport: { type: 'boolean' },
    allowLinker: { type: 'boolean' },
    storage: { type: 'string' },

    allowAdFeatures: { type: 'boolean' },
    dataSource: { type: 'string' },
    queueTime: { type: 'number' },
    forceSSL: { type: 'boolean' },
    transport: { type: 'string' },
  },
  additionalProperties: false,
  required: ['trackingId'],
} as const;

export const themeConfigSchema = {
  type: 'object',
  properties: {
    imports: {
      type: 'array',
      items: { type: 'string' },
      default: [],
    },
    logo: logoConfigSchema,
    navbar: {
      type: 'object',
      properties: {
        items: navItemsSchema,
        ...hideConfigSchema.properties,
      },
      additionalProperties: false,
    },
    footer: {
      type: 'object',
      properties: {
        items: navItemsSchema,
        copyrightText: { type: 'string' },
        ...hideConfigSchema.properties,
      },
      additionalProperties: false,
    },
    sidebar: hideConfigSchema,
    scripts: {
      type: 'object',
      properties: {
        head: { type: 'array', items: scriptConfigSchema },
        body: { type: 'array', items: scriptConfigSchema },
      },
      additionalProperties: false,
    },
    links: { type: 'array', items: linksConfigSchema },
    feedback: {
      type: 'object',
      properties: {
        hide: {
          type: 'boolean',
          default: false,
        },
        type: {
          type: 'string',
          enum: ['rating', 'sentiment', 'comment', 'reasons'],
          default: 'sentiment',
        },
        settings: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            submitText: { type: 'string' },
            max: { type: 'number' },
            buttonText: { type: 'string' },
            multi: { type: 'boolean' },
            items: { type: 'array', items: { type: 'string' }, minItems: 1 },
            reasons: {
              type: 'object',
              properties: {
                enable: { type: 'boolean', default: true },
                multi: { type: 'boolean' },
                label: { type: 'string' },
                items: { type: 'array', items: { type: 'string' } },
              },
              additionalProperties: false,
            },
            comment: {
              type: 'object',
              properties: {
                enable: { type: 'boolean', default: true },
                label: { type: 'string' },
                likeLabel: { type: 'string' },
                dislikeLabel: { type: 'string' },
              },
              additionalProperties: false,
            },
          },
          additionalProperties: false,
          ...hideConfigSchema.properties,
        },
      },
      additionalProperties: false,
      default: {},
    },
    search: {
      type: 'object',
      properties: {
        placement: {
          type: 'string',
          default: 'navbar',
        },
        shortcuts: {
          type: 'array',
          items: { type: 'string' },
          default: ['/'],
        },
        suggestedPages: {
          type: 'array',
          items: suggestedPageSchema,
        },
        ...hideConfigSchema.properties,
      },
      additionalProperties: false,
      default: {},
    },
    colorMode: {
      type: 'object',
      properties: {
        ignoreDetection: { type: 'boolean' },
        modes: {
          type: 'array',
          items: { type: 'string' },
          default: ['light', 'dark'],
        },
        ...hideConfigSchema.properties,
      },
      additionalProperties: false,
      default: {},
    },
    navigation: {
      type: 'object',
      properties: {
        nextButton: {
          type: 'object',
          properties: {
            text: { type: 'string', default: 'Next to {label}' },
            ...hideConfigSchema.properties,
          },
          additionalProperties: false,
          default: {},
        },
        previousButton: {
          type: 'object',
          properties: {
            text: { type: 'string', default: 'Back to {label}' },
            ...hideConfigSchema.properties,
          },
          additionalProperties: false,
          default: {},
        },
      },
      additionalProperties: false,
      default: {},
    },
    codeSnippet: {
      type: 'object',
      properties: {
        controlsStyle: { type: 'string', default: 'icon' },
        copy: {
          type: 'object',
          properties: {
            ...hideConfigSchema.properties,
          },
          additionalProperties: false,
          default: { hide: false },
        },
        report: {
          type: 'object',
          properties: {
            ...hideConfigSchema.properties,
          },
          additionalProperties: false,
          default: { hide: true },
        },
        expand: {
          type: 'object',
          properties: {
            ...hideConfigSchema.properties,
          },
          additionalProperties: false,
          default: { hide: false },
        },
        collapse: {
          type: 'object',
          properties: {
            ...hideConfigSchema.properties,
          },
          additionalProperties: false,
          default: { hide: false },
        },
      },
      additionalProperties: false,
      default: {},
    },
    markdown: markdownConfigSchema,
    openapi: { type: 'object', additionalProperties: true },
    graphql: { type: 'object', additionalProperties: true },
    analytics: {
      type: 'object',
      properties: {
        adobe: adobeAnalyticsConfigSchema,
        amplitude: amplitudeAnalyticsConfigSchema,
        fullstory: fullstoryAnalyticsConfigSchema,
        heap: heapAnalyticsConfigSchema,
        rudderstack: rudderstackAnalyticsConfigSchema,
        segment: segmentAnalyticsConfigSchema,
        gtm: gtmAnalyticsConfigSchema,
        ga: googleAnalyticsConfigSchema,
      },
    },
    userProfile: {
      type: 'object',
      properties: {
        loginLabel: { type: 'string', default: 'Login' },
        logoutLabel: { type: 'string', default: 'Logout' },
        menu: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              external: { type: 'boolean' },
              link: { type: 'string' },
              separatorLine: { type: 'boolean' },
            },
            additionalProperties: true,
          },
          default: [],
        },
        ...hideConfigSchema.properties,
      },
      additionalProperties: false,
      default: {},
    },
    breadcrumbs: {
      type: 'object',
      properties: {
        hide: { type: 'boolean' },
        prefixItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              labelTranslationKey: { type: 'string' },
              page: { type: 'string' },
            },
            additionalProperties: false,
            default: {},
          },
        },
      },
      additionalProperties: false,
      default: {},
    },
  },
  additionalProperties: true,
  default: {},
} as const;

export const ConfigRoot: NodeType = {
  properties: {
    organization: { type: 'string' },
    ...RootConfigStyleguide.properties,
    theme: 'ConfigRootTheme',
    'features.openapi': 'ConfigReferenceDocs', // deprecated
    'features.mockServer': 'ConfigMockServer', // deprecated
    region: { enum: ['us', 'eu'] },
    resolve: {
      properties: {
        http: 'ConfigHTTP',
        doNotResolveExamples: { type: 'boolean' },
      },
    },
    files: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    redirects: { type: 'object', additionalProperties: redirectConfigSchema },
    licenseKey: { type: 'string' },
    apis: 'ConfigApis',
    seo: seoConfigSchema,
    rbac: rbacConfigSchema,
    responseHeaders: responseHeaderSchema,
    mockServer: mockServerConfigSchema,
    sso: ssoConfigSchema,
    developerOnboarding: devOnboardingConfigSchema,
    scorecard: scorecardConfigSchema,
    i18n: i18nConfigSchema,
  },
};

const ConfigRootTheme: NodeType = {
  properties: {
    ...themeConfigSchema.properties,
    mockServer: 'ConfigMockServer',
    openapi: 'ConfigReferenceDocs',
  },
};

const Rules: NodeType = {
  properties: {},
  additionalProperties: (value: unknown, key: string) => {
    if (key.startsWith('rule/')) {
      return 'Assert';
    } else if (key.startsWith('assert/')) {
      // keep the old assert/ prefix as an alias
      return 'Assert';
    } else if (builtInRulesList.includes(key) || isCustomRuleId(key)) {
      if (typeof value === 'string') {
        return { enum: ['error', 'warn', 'off'] };
      } else {
        return 'ObjectRule';
      }
    }
    // Otherwise is considered as invalid
    return;
  },
};

const ObjectRule: NodeType = {
  properties: {
    severity: { enum: ['error', 'warn', 'off'] },
  },
  additionalProperties: {},
  required: ['severity'],
};

const AssertionDefinitionSubject: NodeType = {
  properties: {
    type: { enum: nodeTypesList },
    property: (value: unknown) => {
      if (Array.isArray(value)) {
        return { type: 'array', items: { type: 'string' } };
      } else if (value === null) {
        return null;
      } else {
        return { type: 'string' };
      }
    },
    filterInParentKeys: { type: 'array', items: { type: 'string' } },
    filterOutParentKeys: { type: 'array', items: { type: 'string' } },
    matchParentKeys: { type: 'string' },
  },
  required: ['type'],
};

const AssertionDefinitionAssertions: NodeType = {
  properties: {
    enum: { type: 'array', items: { type: 'string' } },
    pattern: { type: 'string' },
    notPattern: { type: 'string' },
    casing: {
      enum: [
        'camelCase',
        'kebab-case',
        'snake_case',
        'PascalCase',
        'MACRO_CASE',
        'COBOL-CASE',
        'flatcase',
      ],
    },
    mutuallyExclusive: { type: 'array', items: { type: 'string' } },
    mutuallyRequired: { type: 'array', items: { type: 'string' } },
    required: { type: 'array', items: { type: 'string' } },
    requireAny: { type: 'array', items: { type: 'string' } },
    disallowed: { type: 'array', items: { type: 'string' } },
    defined: { type: 'boolean' },
    // undefined: { type: 'boolean' }, // TODO: Remove `undefined` assertion from codebase overall
    nonEmpty: { type: 'boolean' },
    minLength: { type: 'integer' },
    maxLength: { type: 'integer' },
    ref: (value: string | boolean) =>
      typeof value === 'string' ? { type: 'string' } : { type: 'boolean' },
    const: (value: string | boolean | number) => {
      if (typeof value === 'string') {
        return { type: 'string' };
      }
      if (typeof value === 'number') {
        return { type: 'number' };
      }
      if (typeof value === 'boolean') {
        return { type: 'boolean' };
      } else {
        return;
      }
    },
  },
  additionalProperties: (_value: unknown, key: string) => {
    if (/^\w+\/\w+$/.test(key)) return { type: 'object' };
    return;
  },
};

const AssertDefinition: NodeType = {
  properties: {
    subject: 'AssertionDefinitionSubject',
    assertions: 'AssertionDefinitionAssertions',
  },
  required: ['subject', 'assertions'],
};

const Assert: NodeType = {
  properties: {
    subject: 'AssertionDefinitionSubject',
    assertions: 'AssertionDefinitionAssertions',
    where: listOf('AssertDefinition'),
    message: { type: 'string' },
    suggest: { type: 'array', items: { type: 'string' } },
    severity: { enum: ['error', 'warn', 'off'] },
  },
  required: ['subject', 'assertions'],
};

const ConfigLanguage: NodeType = {
  properties: {
    label: { type: 'string' },
    lang: {
      enum: [
        'curl',
        'C#',
        'Go',
        'Java',
        'Java8+Apache',
        'JavaScript',
        'Node.js',
        'PHP',
        'Python',
        'R',
        'Ruby',
      ],
    },
  },
  required: ['lang'],
};

const ConfigLabels: NodeType = {
  properties: {
    enum: { type: 'string' },
    enumSingleValue: { type: 'string' },
    enumArray: { type: 'string' },
    default: { type: 'string' },
    deprecated: { type: 'string' },
    example: { type: 'string' },
    examples: { type: 'string' },
    nullable: { type: 'string' },
    recursive: { type: 'string' },
    arrayOf: { type: 'string' },
    webhook: { type: 'string' },
    authorizations: { type: 'string' },
    tryItAuthBasicUsername: { type: 'string' },
    tryItAuthBasicPassword: { type: 'string' },
  },
};

const ConfigSidebarLinks: NodeType = {
  properties: {
    beforeInfo: listOf('CommonConfigSidebarLinks'),
    end: listOf('CommonConfigSidebarLinks'),
  },
};

const CommonConfigSidebarLinks: NodeType = {
  properties: {
    label: { type: 'string' },
    link: { type: 'string' },
    target: { type: 'string' },
  },
  required: ['label', 'link'],
};

const CommonThemeColors: NodeType = {
  properties: {
    main: { type: 'string' },
    light: { type: 'string' },
    dark: { type: 'string' },
    contrastText: { type: 'string' },
  },
};

const CommonColorProps: NodeType = {
  properties: {
    backgroundColor: { type: 'string' },
    borderColor: { type: 'string' },
    color: { type: 'string' },
    tabTextColor: { type: 'string' },
  },
};

const BorderThemeColors: NodeType = {
  properties: pickObjectProps(CommonThemeColors.properties, ['light', 'dark']),
};

const HttpColors: NodeType = {
  properties: {
    basic: { type: 'string' },
    delete: { type: 'string' },
    get: { type: 'string' },
    head: { type: 'string' },
    link: { type: 'string' },
    options: { type: 'string' },
    patch: { type: 'string' },
    post: { type: 'string' },
    put: { type: 'string' },
  },
};

const ResponseColors: NodeType = {
  properties: {
    error: 'CommonColorProps',
    info: 'CommonColorProps',
    redirect: 'CommonColorProps',
    success: 'CommonColorProps',
  },
};

const SecondaryColors: NodeType = {
  properties: omitObjectProps(CommonThemeColors.properties, ['dark']),
};

const TextThemeColors: NodeType = {
  properties: {
    primary: { type: 'string' },
    secondary: { type: 'string' },
    light: { type: 'string' },
  },
};

const ThemeColors: NodeType = {
  properties: {
    accent: 'CommonThemeColors',
    border: 'BorderThemeColors',
    error: 'CommonThemeColors',
    http: 'HttpColors',
    primary: 'CommonThemeColors',
    responses: 'ResponseColors',
    secondary: 'SecondaryColors',
    success: 'CommonThemeColors',
    text: 'TextThemeColors',
    tonalOffset: { type: 'number' },
    warning: 'CommonThemeColors',
  },
};

const SizeProps: NodeType = {
  properties: {
    fontSize: { type: 'string' },
    padding: { type: 'string' },
    minWidth: { type: 'string' },
  },
};

const Sizes: NodeType = {
  properties: {
    small: 'SizeProps',
    medium: 'SizeProps',
    large: 'SizeProps',
    xlarge: 'SizeProps',
  },
};

const FontConfig: NodeType = {
  properties: {
    fontFamily: { type: 'string' },
    fontSize: { type: 'string' },
    fontWeight: { type: 'string' },
    lineHeight: { type: 'string' },
  },
};

const ButtonsConfig: NodeType = {
  properties: {
    ...omitObjectProps(FontConfig.properties, ['fontSize', 'lineHeight']),
    borderRadius: { type: 'string' },
    hoverStyle: { type: 'string' },
    boxShadow: { type: 'string' },
    hoverBoxShadow: { type: 'string' },
    sizes: 'Sizes',
  },
};

const BadgeFontConfig: NodeType = {
  properties: pickObjectProps(FontConfig.properties, ['fontSize', 'lineHeight']),
};

const BadgeSizes: NodeType = {
  properties: {
    medium: 'BadgeFontConfig',
    small: 'BadgeFontConfig',
  },
};

const HttpBadgesConfig: NodeType = {
  properties: {
    ...omitObjectProps(FontConfig.properties, ['fontSize', 'lineHeight']),
    borderRadius: { type: 'string' },
    color: { type: 'string' },
    sizes: 'BadgeSizes',
  },
};

const LabelControls: NodeType = {
  properties: {
    top: { type: 'string' },
    width: { type: 'string' },
    height: { type: 'string' },
  },
};

const Panels: NodeType = {
  properties: {
    borderRadius: { type: 'string' },
    backgroundColor: { type: 'string' },
  },
};

const TryItButton: NodeType = {
  properties: {
    fullWidth: { type: 'boolean' },
  },
};

const Components: NodeType = {
  properties: {
    buttons: 'ButtonsConfig',
    httpBadges: 'HttpBadgesConfig',
    layoutControls: 'LabelControls',
    panels: 'Panels',
    tryItButton: 'TryItButton',
    tryItSendButton: 'TryItButton',
  },
};

const Breakpoints: NodeType = {
  properties: {
    small: { type: 'string' },
    medium: { type: 'string' },
    large: { type: 'string' },
  },
};

const StackedConfig: NodeType = {
  properties: {
    maxWidth: 'Breakpoints',
  },
};

const ThreePanelConfig: NodeType = {
  properties: {
    maxWidth: 'Breakpoints',
    middlePanelMaxWidth: 'Breakpoints',
  },
};

const Layout: NodeType = {
  properties: {
    showDarkRightPanel: { type: 'boolean' },
    stacked: 'StackedConfig',
    'three-panel': 'ThreePanelConfig',
  },
};

const SchemaColorsConfig: NodeType = {
  properties: {
    backgroundColor: { type: 'string' },
    border: { type: 'string' },
  },
};

const Schema: NodeType = {
  properties: {
    breakFieldNames: { type: 'boolean' },
    caretColor: { type: 'string' },
    caretSize: { type: 'string' },
    constraints: 'SchemaColorsConfig',
    defaultDetailsWidth: { type: 'string' },
    examples: 'SchemaColorsConfig',
    labelsTextSize: { type: 'string' },
    linesColor: { type: 'string' },
    nestedBackground: { type: 'string' },
    nestingSpacing: { type: 'string' },
    requireLabelColor: { type: 'string' },
    typeNameColor: { type: 'string' },
    typeTitleColor: { type: 'string' },
  },
};

const GroupItemsConfig: NodeType = {
  properties: {
    subItemsColor: { type: 'string' },
    textTransform: { type: 'string' },
    fontWeight: { type: 'string' },
  },
};

const Level1Items: NodeType = {
  properties: pickObjectProps(GroupItemsConfig.properties, ['textTransform']),
};

const SpacingConfig: NodeType = {
  properties: {
    unit: { type: 'number' },
    paddingHorizontal: { type: 'string' },
    paddingVertical: { type: 'string' },
    offsetTop: { type: 'string' },
    offsetLeft: { type: 'string' },
    offsetNesting: { type: 'string' },
  },
};

const Sidebar: NodeType = {
  properties: {
    ...omitObjectProps(FontConfig.properties, ['fontWeight', 'lineHeight']),
    activeBgColor: { type: 'string' },
    activeTextColor: { type: 'string' },
    backgroundColor: { type: 'string' },
    borderRadius: { type: 'string' },
    breakPath: { type: 'boolean' },
    caretColor: { type: 'string' },
    caretSize: { type: 'string' },
    groupItems: 'GroupItemsConfig',
    level1items: 'Level1Items',
    rightLineColor: { type: 'string' },
    separatorLabelColor: { type: 'string' },
    showAtBreakpoint: { type: 'string' },
    spacing: 'SpacingConfig',
    textColor: { type: 'string' },
    width: { type: 'string' },
  },
};

const Heading: NodeType = {
  properties: {
    ...FontConfig.properties,
    color: { type: 'string' },
    transform: { type: 'string' },
  },
};

const CodeConfig: NodeType = {
  properties: {
    ...FontConfig.properties,
    backgroundColor: { type: 'string' },
    color: { type: 'string' },
    wordBreak: {
      enum: [
        'break-all',
        'break-word',
        'keep-all',
        'normal',
        'revert',
        'unset',
        'inherit',
        'initial',
      ],
    },
    wrap: { type: 'boolean' },
  },
};

const HeadingsConfig: NodeType = {
  properties: omitObjectProps(FontConfig.properties, ['fontSize']),
};

const LinksConfig: NodeType = {
  properties: {
    color: { type: 'string' },
    hover: { type: 'string' },
    textDecoration: { type: 'string' },
    hoverTextDecoration: { type: 'string' },
    visited: { type: 'string' },
  },
};

const Typography: NodeType = {
  properties: {
    code: 'CodeConfig',
    fieldName: 'FontConfig',
    ...pickObjectProps(FontConfig.properties, ['fontSize', 'fontFamily']),
    fontWeightBold: { type: 'string' },
    fontWeightLight: { type: 'string' },
    fontWeightRegular: { type: 'string' },
    heading1: 'Heading',
    heading2: 'Heading',
    heading3: 'Heading',
    headings: 'HeadingsConfig',
    lineHeight: { type: 'string' },
    links: 'LinksConfig',
    optimizeSpeed: { type: 'boolean' },
    rightPanelHeading: 'Heading',
    smoothing: { enum: ['auto', 'none', 'antialiased', 'subpixel-antialiased', 'grayscale'] },
  },
};

const TokenProps: NodeType = {
  properties: {
    color: { type: 'string' },
    ...omitObjectProps(FontConfig.properties, ['fontWeight']),
  },
};

const CodeBlock: NodeType = {
  properties: {
    backgroundColor: { type: 'string' },
    borderRadius: { type: 'string' },
    tokens: 'TokenProps',
  },
};

const Logo: NodeType = {
  properties: {
    gutter: { type: 'string' },
    maxHeight: { type: 'string' },
    maxWidth: { type: 'string' },
  },
};

const Fab: NodeType = {
  properties: {
    backgroundColor: { type: 'string' },
    color: { type: 'string' },
  },
};

const ButtonOverrides: NodeType = {
  properties: {
    custom: { type: 'string' },
  },
};

const Overrides: NodeType = {
  properties: {
    DownloadButton: 'ButtonOverrides',
    NextSectionButton: 'ButtonOverrides',
  },
};

const RightPanel: NodeType = {
  properties: {
    backgroundColor: { type: 'string' },
    panelBackgroundColor: { type: 'string' },
    panelControlsBackgroundColor: { type: 'string' },
    showAtBreakpoint: { type: 'string' },
    textColor: { type: 'string' },
    width: { type: 'string' },
  },
};

const Shape: NodeType = {
  properties: { borderRadius: { type: 'string' } },
};

const ThemeSpacing: NodeType = {
  properties: {
    sectionHorizontal: { type: 'number' },
    sectionVertical: { type: 'number' },
    unit: { type: 'number' },
  },
};

const ConfigTheme: NodeType = {
  properties: {
    breakpoints: 'Breakpoints',
    codeBlock: 'CodeBlock',
    colors: 'ThemeColors',
    components: 'Components',
    layout: 'Layout',
    logo: 'Logo',
    fab: 'Fab',
    overrides: 'Overrides',
    rightPanel: 'RightPanel',
    schema: 'Schema',
    shape: 'Shape',
    sidebar: 'Sidebar',
    spacing: 'ThemeSpacing',
    typography: 'Typography',
    links: { properties: { color: { type: 'string' } } }, // deprecated
    codeSample: { properties: { backgroundColor: { type: 'string' } } }, // deprecated
  },
};

const GenerateCodeSamples: NodeType = {
  properties: {
    skipOptionalParameters: { type: 'boolean' },
    languages: listOf('ConfigLanguage'),
  },
  required: ['languages'],
};

const ConfigReferenceDocs: NodeType = {
  properties: {
    theme: 'ConfigTheme',
    corsProxyUrl: { type: 'string' },
    ctrlFHijack: { type: 'boolean' },
    defaultSampleLanguage: { type: 'string' },
    disableDeepLinks: { type: 'boolean' },
    disableSearch: { type: 'boolean' },
    disableSidebar: { type: 'boolean' },
    downloadDefinitionUrl: { type: 'string' },
    expandDefaultServerVariables: { type: 'boolean' },
    enumSkipQuotes: { type: 'boolean' },
    expandDefaultRequest: { type: 'boolean' },
    expandDefaultResponse: { type: 'boolean' },
    expandResponses: { type: 'string' },
    expandSingleSchemaField: { type: 'boolean' },
    generateCodeSamples: 'GenerateCodeSamples',
    generatedPayloadSamplesMaxDepth: { type: 'number' },
    hideDownloadButton: { type: 'boolean' },
    hideHostname: { type: 'boolean' },
    hideInfoSection: { type: 'boolean' },
    hideLoading: { type: 'boolean' },
    hideLogo: { type: 'boolean' },
    hideRequestPayloadSample: { type: 'boolean' },
    hideRightPanel: { type: 'boolean' },
    hideSchemaPattern: { type: 'boolean' },
    hideSchemaTitles: { type: 'boolean' },
    hideSingleRequestSampleTab: { type: 'boolean' },
    hideSecuritySection: { type: 'boolean' },
    hideTryItPanel: { type: 'boolean' },
    hideFab: { type: 'boolean' },
    hideOneOfDescription: { type: 'boolean' },
    htmlTemplate: { type: 'string' },
    jsonSampleExpandLevel: (value: unknown) => {
      if (typeof value === 'number') {
        return { type: 'number', minimum: 1 };
      } else {
        return { type: 'string' };
      }
    },
    labels: 'ConfigLabels',
    layout: { enum: ['stacked', 'three-panel'] },
    maxDisplayedEnumValues: { type: 'number' },
    menuToggle: { type: 'boolean' },
    nativeScrollbars: { type: 'boolean' },
    noAutoAuth: { type: 'boolean' }, // deprecated
    oAuth2RedirectURI: { type: 'string' },
    onDeepLinkClick: { type: 'object' },
    onlyRequiredInSamples: { type: 'boolean' },
    pagination: { enum: ['none', 'section', 'item'] },
    pathInMiddlePanel: { type: 'boolean' },
    payloadSampleIdx: { type: 'number', minimum: 0 },
    requestInterceptor: { type: 'object' },
    requiredPropsFirst: { type: 'boolean' },
    routingBasePath: { type: 'string' },
    routingStrategy: { type: 'string' }, // deprecated
    samplesTabsMaxCount: { type: 'number' },
    schemaExpansionLevel: (value: unknown) => {
      if (typeof value === 'number') {
        return { type: 'number', minimum: 0 };
      } else {
        return { type: 'string' };
      }
    },
    schemaDefinitionsTagName: { type: 'string' },
    minCharacterLengthToInitSearch: { type: 'number', minimum: 1 },
    maxResponseHeadersToShowInTryIt: { type: 'number', minimum: 0 },
    scrollYOffset: (value: unknown) => {
      if (typeof value === 'number') {
        return { type: 'number' };
      } else {
        return { type: 'string' };
      }
    },
    searchAutoExpand: { type: 'boolean' },
    searchFieldLevelBoost: { type: 'number', minimum: 0 },
    searchMaxDepth: { type: 'number', minimum: 1 },
    searchMode: { enum: ['default', 'path-only'] },
    searchOperationTitleBoost: { type: 'number' },
    searchTagTitleBoost: { type: 'number' },
    sendXUserAgentInTryIt: { type: 'boolean' },
    showChangeLayoutButton: { type: 'boolean' },
    showConsole: { type: 'boolean' }, // deprecated
    showExtensions: (value: unknown) => {
      if (typeof value === 'boolean') {
        return { type: 'boolean' };
      } else {
        return {
          type: 'array',
          items: {
            type: 'string',
          },
        };
      }
    },
    showNextButton: { type: 'boolean' },
    showRightPanelToggle: { type: 'boolean' },
    showSecuritySchemeType: { type: 'boolean' },
    showWebhookVerb: { type: 'boolean' },
    showObjectSchemaExamples: { type: 'boolean' },
    disableTryItRequestUrlEncoding: { type: 'boolean' },
    sidebarLinks: 'ConfigSidebarLinks',
    sideNavStyle: { enum: ['summary-only', 'path-first', 'id-only'] },
    simpleOneOfTypeLabel: { type: 'boolean' },
    sortEnumValuesAlphabetically: { type: 'boolean' },
    sortOperationsAlphabetically: { type: 'boolean' },
    sortPropsAlphabetically: { type: 'boolean' },
    sortTagsAlphabetically: { type: 'boolean' },
    suppressWarnings: { type: 'boolean' }, // deprecated
    unstable_externalDescription: { type: 'boolean' }, // deprecated
    unstable_ignoreMimeParameters: { type: 'boolean' },
    untrustedDefinition: { type: 'boolean' },
    mockServer: {
      properties: {
        url: { type: 'string' },
        position: { enum: ['first', 'last', 'replace', 'off'] },
        description: { type: 'string' },
      },
    },
    showAccessMode: { type: 'boolean' },
    preserveOriginalExtensionsName: { type: 'boolean' },
    markdownHeadingsAnchorLevel: { type: 'number' },
  },
  additionalProperties: { type: 'string' },
};

const ConfigMockServer: NodeType = {
  properties: {
    strictExamples: { type: 'boolean' },
    errorIfForcedExampleNotFound: { type: 'boolean' },
  },
};

export const ConfigTypes: Record<string, NodeType> = {
  Assert,
  ConfigRoot,
  ConfigApis,
  ConfigApisProperties,
  RootConfigStyleguide,
  ConfigStyleguide,
  ConfigReferenceDocs,
  ConfigMockServer,
  ConfigHTTP,
  ConfigLanguage,
  ConfigLabels,
  ConfigSidebarLinks,
  CommonConfigSidebarLinks,
  ConfigTheme,
  ConfigRootTheme,
  AssertDefinition,
  ThemeColors,
  CommonThemeColors,
  BorderThemeColors,
  HttpColors,
  ResponseColors,
  SecondaryColors,
  TextThemeColors,
  Sizes,
  ButtonsConfig,
  CommonColorProps,
  BadgeFontConfig,
  BadgeSizes,
  HttpBadgesConfig,
  LabelControls,
  Panels,
  TryItButton,
  Breakpoints,
  StackedConfig,
  ThreePanelConfig,
  SchemaColorsConfig,
  SizeProps,
  Level1Items,
  SpacingConfig,
  FontConfig,
  CodeConfig,
  HeadingsConfig,
  LinksConfig,
  TokenProps,
  CodeBlock,
  Logo,
  Fab,
  ButtonOverrides,
  Overrides,
  ObjectRule,
  RightPanel,
  Rules,
  Shape,
  ThemeSpacing,
  GenerateCodeSamples,
  GroupItemsConfig,
  Components,
  Layout,
  Schema,
  Sidebar,
  Heading,
  Typography,
  AssertionDefinitionAssertions,
  AssertionDefinitionSubject,
};
