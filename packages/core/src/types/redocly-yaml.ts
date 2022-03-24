import { NodeType, listOf } from '.';
import { omitObjectProps, pickObjectProps } from '../utils';

const ConfigRoot: NodeType = {
  properties: {
    organization: { type: 'string' },
    apis: 'ConfigApis',
    lint: 'RootConfigLint',
    'features.openapi': 'ConfigReferenceDocs',
    'features.mockServer': 'ConfigMockServer',
  },
};

const ConfigApis: NodeType = {
  properties: {},
  additionalProperties: 'ConfigApisProperties',
};

const ConfigApisProperties: NodeType = {
  properties: {
    root: { type: 'string' },
    lint: 'ConfigLint',
    'features.openapi': 'ConfigReferenceDocs',
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

const RootConfigLint: NodeType = {
  properties: {
    plugins: {
      type: 'array',
      items: { type: 'string' },
    },
    ...ConfigLint.properties,
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
    errors: 'CommonColorProps',
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
  },
};

const Panels: NodeType = {
  properties: {
    borderRadius: { type: 'string' },
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
    wordBreak: { type: 'string' },
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
    smoothing: { type: 'string' },
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
    overrides: 'Overrides',
    rightPanel: 'RightPanel',
    schema: 'Schema',
    shape: 'Shape',
    sidebar: 'Sidebar',
    spacing: 'ThemeSpacing',
    typography: 'Typography',
    links: { properties: { color: { type: 'string' } } },
    codeSample: { properties: { backgroundColor: { type: 'string' } } },
  },
};

const GenerateCodeSamples: NodeType = {
  properties: {
    skipOptionalParameters: { type: 'boolean' },
    languages: listOf('ConfigLanguage'),
  },
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
    hideSchemaPattern: { type: 'boolean' },
    hideSchemaTitles: { type: 'boolean' },
    hideSingleRequestSampleTab: { type: 'boolean' },
    htmlTemplate: { type: 'string' },
    jsonSampleExpandLevel: { type: 'string' },
    labels: 'ConfigLabels',
    layout: { type: 'string' },
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

const ConfigMockServer: NodeType = {
  properties: {
    strictExamples: { type: 'boolean' },
    errorIfForcedExampleNotFound: { type: 'boolean' },
  },
};

export const ConfigTypes: Record<string, NodeType> = {
  ConfigRoot,
  ConfigApis,
  ConfigApisProperties,
  RootConfigLint,
  ConfigLint,
  ConfigReferenceDocs,
  ConfigMockServer,
  ConfigHTTP,
  ConfigLanguage,
  ConfigLabels,
  ConfigSidebarLinks,
  ConfigTheme,
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
  ButtonOverrides,
  Overrides,
  RightPanel,
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
};
