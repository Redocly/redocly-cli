import { NodeType, listOf } from '.';
import { omitObjectProps, pickObjectProps, isCustomRuleId } from '../utils';

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

const RootConfigStyleguide: NodeType = {
  properties: {
    plugins: {
      type: 'array',
      items: { type: 'string' },
    },
    ...ConfigStyleguide.properties,
  },
};

const ConfigRoot: NodeType = {
  properties: {
    organization: { type: 'string' },
    apis: 'ConfigApis',
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
    if (key.startsWith('assert/')) {
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
