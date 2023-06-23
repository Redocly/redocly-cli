import {
  ApigeeDevOnboardingIntegrationAuthType,
  AuthProviderType,
  DEFAULT_TEAM_CLAIM_NAME,
} from '../config';

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

const rbacScopeItemsSchema = { type: 'object', additionalProperties: { type: 'string' } } as const;

export const rbacConfigSchema = {
  type: 'object',
  properties: {
    defaults: rbacScopeItemsSchema,
  },
  additionalProperties: rbacScopeItemsSchema,
} as const;

export const ssoConfigSchema = {
  type: 'object',
  additionalProperties: authProviderConfigSchema,
} as const;

export const redirectConfigSchema = {
  type: 'object',
  properties: {
    to: { type: 'string' },
    type: { type: 'number', default: 301 },
  },
  required: ['to'],
  additionalProperties: false,
} as const;

export const seoConfigSchema = {
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

const devOnboardingAdapterConfigSchema = {
  type: 'object',
  oneOf: [apigeeXAdapterConfigSchema, apigeeEdgeAdapterConfigSchema, graviteeAdapterConfigSchema],
  discriminator: { propertyName: 'type' },
} as const;

export const devOnboardingConfigSchema = {
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

export const responseHeaderSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    value: { type: 'string' },
  },
  additionalProperties: false,
  required: ['name', 'value'],
} as const;

export const scorecardConfigSchema = {
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

export const i18nConfigSchema = {
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

export const mockServerConfigSchema = {
  type: 'object',
  properties: {
    off: { type: 'boolean', default: false },
    position: { type: 'string', enum: ['first', 'last', 'replace', 'off'], default: 'first' },
    strictExamples: { type: 'boolean', default: false },
    errorIfForcedExampleNotFound: { type: 'boolean', default: false },
    description: { type: 'string' },
  },
} as const;

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
