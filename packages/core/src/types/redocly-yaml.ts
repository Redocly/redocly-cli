import { NodeType, listOf } from '.';

const ConfigRoot: NodeType = {
  properties: {
    apiDefinitions: {
      type: 'object',
      properties: {},
      additionalProperties: { properties: { type: 'string' } }
    },
    lint: 'ConfigLint',
    referenceDocs: 'ConfigReferenceDocs',
  },
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

const ConfigLint: NodeType = {
  properties: {
    plugins: {
      type: 'array',
      items: { type: 'string' },
    },
    extends: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    doNotResolveExamples: { type: 'boolean' },
    rules: { type: 'object' },
    oas2Rules: { type: 'object' },
    oas3_0Rules: { type: 'object' },
    oas3_1Rules: { type: 'object' },
    preprocessors: { type: 'object' },
    oas2Preprocessors: { type: 'object' },
    oas3_0Preprocessors: { type: 'object' },
    oas3_1Preprocessors: { type: 'object' },
    decorators: { type: 'object' },
    oas2Decorators: { type: 'object' },
    oas3_0Decorators: { type: 'object' },
    oas3_1Decorators: { type: 'object' },
    resolve: {
      properties: {
        http: 'ConfigHTTP',
      },
    },
  },
};

const ConfigLanguage: NodeType = {
  properties: {
    label: { type: 'string' },
    lang: { type: 'string' },
  },
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
    placement: { type: 'string' },
    label: { type: 'string' },
    link: { type: 'string' },
    target: { type: 'string' },
  },
};

const ConfigTheme: NodeType = {
  properties: {
    breakpoints: { type: 'object', additionalProperties: { type: 'string' } },
    codeBlock: { type: 'object', additionalProperties: { type: 'string' } },
    colors: { type: 'object', additionalProperties: { type: 'string' } },
    components: { type: 'object', additionalProperties: { type: 'string' } },
    layout: { type: 'object', additionalProperties: { type: 'string' } },
    logo: { type: 'object', additionalProperties: { type: 'string' } },
    overrides: { type: 'object', additionalProperties: { type: 'string' } },
    rightPanel: { type: 'object', additionalProperties: { type: 'string' } },
    schema: { type: 'object', additionalProperties: { type: 'string' } },
    shape: { type: 'object', additionalProperties: { type: 'string' } },
    sidebar: { type: 'object', additionalProperties: { type: 'string' } },
    spacing: { type: 'object', additionalProperties: { type: 'string' } },
    typography: { type: 'object', additionalProperties: { type: 'string' } },
    links: { properties: { color: { type: 'string' } } },
    codeSample: { properties: { backgroundColor: { type: 'string' } } },
  },
}

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
    expandResponses: { type: 'string' },
    expandSingleSchemaField: { type: 'boolean' },
    generateCodeSamples: {
      properties: {
        skipOptionalParameters: { type: 'boolean' },
        languages: listOf('ConfigLanguage'),
      },
    },
    generatedPayloadSamplesMaxDepth: { type: 'number' },
    hideDownloadButton: { type: 'boolean' },
    hideHostname: { type: 'boolean' },
    hideInfoSection: { type: 'boolean' },
    hideLoading: { type: 'boolean' },
    hideLogo: { type: 'boolean' },
    hideRequestPayloadSample: { type: 'boolean' },
    hideSchemaPattern: { type: 'boolean' },
    hideSchemaTitles: { type: 'boolean' },
    hideSingleRequestSampleTab: { type: 'boolean' },
    htmlTemplate: { type: 'string' },
    jsonSampleExpandLevel: { type: 'string' },
    labels: 'ConfigLabels',
    layout: { type: 'object' },
    maxDisplayedEnumValues: { type: 'number' },
    menuToggle: { type: 'boolean' },
    nativeScrollbars: { type: 'boolean' },
    noAutoAuth: { type: 'boolean' },
    oAuth2RedirectURI: { type: 'string' },
    onDeepLinkClick: { type: 'object' },
    onlyRequiredInSamples: { type: 'boolean' },
    pagination: { type: 'string' },
    pathInMiddlePanel: { type: 'boolean' },
    payloadSampleIdx: { type: 'number' },
    requestInterceptor: { type: 'object' },
    requiredPropsFirst: { type: 'boolean' },
    routingBasePath: { type: 'string' },
    samplesTabsMaxCount: { type: 'number' },
    schemaExpansionLevel: { type: 'string' },
    scrollYOffset: { type: 'string' },
    searchAutoExpand: { type: 'boolean' },
    searchFieldLevelBoost: { type: 'number' },
    searchMode: { type: 'string' },
    searchOperationTitleBoost: { type: 'number' },
    searchTagTitleBoost: { type: 'number' },
    showChangeLayoutButton: { type: 'boolean' },
    showConsole: { type: 'boolean' },
    showExtensions: { type: 'boolean' },
    showNextButton: { type: 'boolean' },
    showRightPanelToggle: { type: 'boolean' },
    sidebarLinks: 'ConfigSidebarLinks',
    sideNavStyle: { type: 'string' },
    simpleOneOfTypeLabel: { type: 'boolean' },
    sortEnumValuesAlphabetically: { type: 'boolean' },
    sortOperationsAlphabetically: { type: 'boolean' },
    sortPropsAlphabetically: { type: 'boolean' },
    sortTagsAlphabetically: { type: 'boolean' },
    unstable_ignoreMimeParameters: { type: 'boolean' },
    untrustedDefinition: { type: 'boolean' },
  },
  additionalProperties: { type: 'string' },
};

export const ConfigTypes: Record<string, NodeType> = {
  ConfigRoot,
  ConfigLint,
  ConfigReferenceDocs,
  ConfigHTTP,
  ConfigLanguage,
  ConfigLabels,
  ConfigSidebarLinks,
  ConfigTheme,
};
