import { NodeType, listOf } from '.';
import { omitObjectProps, pickObjectProps, isCustomRuleId } from '../utils';
import { ApigeeDevOnboardingIntegrationAuthType, AuthProviderType, DEFAULT_TEAM_CLAIM_NAME } from '../config';

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
  'spec-ref-validation',
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

export const RootConfigStyleguide: any = {
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


const apiConfigSchema = {
  type: 'object',
  additionalProperties: {
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
  }
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
};

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
};

const mockServerConfigSchema = {
  type: 'object',
  properties: {
    off: { type: 'boolean', default: false },
    position: { type: 'string', enum: ['first', 'last', 'replace', 'off'], default: 'first' },
    strictExamples: { type: 'boolean', default: false },
    errorIfForcedExampleNotFound: { type: 'boolean', default: false },
    description: { type: 'string' },
  },
};


export const ConfigRoot = {
  properties: {
    organization: { type: 'string' },
    ...RootConfigStyleguide.properties,
    theme: { type: 'object', default: {} },
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
    redirects: { type: 'object', additionalProperties: redirectConfigSchema, default: {} },
    licenseKey: { type: 'string' },
    apis: apiConfigSchema,
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

const ConfigRootTheme: NodeType = {
  properties: {
    openapi: 'ConfigReferenceDocs',
    mockServer: 'ConfigMockServer',
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
