import { NodeType, listOf } from '.';

const ConfigRoot: NodeType = {
  properties: {
    apiDefinitions: {
      type: 'object',
      properties: {},
      additionalProperties: { properties: { type: 'string' } },
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

const ThemeColors: NodeType = {
  properties: {
    accent: 'CommonThemeColors',
    border: {
      type: 'object',
      properties: {
        light: { type: 'string' },
        dark: { type: 'string' },
      },
    },
    error: 'CommonThemeColors',
    http: {
      type: 'object',
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
    },
    primary: 'CommonThemeColors',
    responses: {
      type: 'object',
      properties: {
        errors: 'CommonColorProps',
        info: 'CommonColorProps',
        redirect: 'CommonColorProps',
        success: 'CommonColorProps',
      },
    },
    secondary: {
      type: 'object',
      properties: {
        main: { type: 'string' },
        light: { type: 'string' },
        contrastText: { type: 'string' },
      },
    },
    success: 'CommonThemeColors',
    text: {
      type: 'object',
      properties: {
        primary: { type: 'string' },
        secondary: { type: 'string' },
        light: { type: 'string' },
      },
    },
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

const Components: NodeType = {
  properties: {
    buttons: {
      type: 'object',
      properties: {
        borderRadius: { type: 'string' },
        hoverStyle: { type: 'string' },
        fontWeight: { type: 'string' },
        boxShadow: { type: 'string' },
        hoverBoxShadow: { type: 'string' },
        fontFamily: { type: 'string' },
        sizes: {
          type: 'object',
          properties: {
            small: 'SizeProps',
            medium: 'SizeProps',
            large: 'SizeProps',
            xlarge: 'SizeProps',
          },
        },
      },
    },
    httpBadges: {
      type: 'object',
      properties: {
        borderRadius: { type: 'string' },
        color: { type: 'string' },
        fontFamily: { type: 'string' },
        fontWeight: { type: 'string' },
        sizes: {
          type: 'object',
          properties: {
            medium: {
              type: 'object',
              properties: {
                fontSize: { type: 'string' },
                lineHeight: { type: 'string' },
              },
            },
            small: {
              type: 'object',
              properties: {
                fontSize: { type: 'string' },
                lineHeight: { type: 'string' },
              },
            },
          },
        },
      },
    },
    layoutControls: {
      type: 'object',
      properties: {
        top: { type: 'string' },
      },
    },
    panels: {
      type: 'object',
      properties: {
        borderRadius: { type: 'string' },
      },
    },
    tryItButton: {
      type: 'object',
      properties: {
        fullWidth: { type: 'boolean' },
      },
    },
    tryItSendButton: {
      type: 'object',
      properties: {
        fullWidth: { type: 'boolean' },
      },
    },
  },
};

const Layout: NodeType = {
  properties: {
    showDarkRightPanel: { type: 'boolean' },
    stacked: {
      type: 'object',
      properties: {
        maxWidth: {
          type: 'object',
          properties: {
            small: { type: 'string' },
            medium: { type: 'string' },
            large: { type: 'string' },
          },
        },
      },
    },
    'three-panel': {
      type: 'object',
      properties: {
        maxWidth: {
          type: 'object',
          properties: {
            small: { type: 'string' },
            medium: { type: 'string' },
            large: { type: 'string' },
          },
        },
      },
    },
  },
};

const Schema: NodeType = {
  properties: {
    breakFieldNames: { type: 'boolean' },
    caretColor: { type: 'string' },
    caretSize: { type: 'string' },
    constraints: {
      type: 'object',
      properties: {
        backgroundColor: { type: 'string' },
        border: { type: 'string' },
      },
    },
    defaultDetailsWidth: { type: 'string' },
    examples: {
      type: 'object',
      properties: {
        backgroundColor: { type: 'string' },
        border: { type: 'string' },
      },
    },
    labelsTextSize: { type: 'string' },
    linesColor: { type: 'string' },
    nestedBackground: { type: 'string' },
    nestingSpacing: { type: 'string' },
    requireLabelColor: { type: 'string' },
    typeNameColor: { type: 'string' },
    typeTitleColor: { type: 'string' },
  },
};

const Sidebar: NodeType = {
  properties: {
    activeBgColor: { type: 'string' },
    activeTextColor: { type: 'string' },
    backgroundColor: { type: 'string' },
    borderRadius: { type: 'string' },
    breakPath: { type: 'boolean' },
    caretColor: { type: 'string' },
    caretSize: { type: 'string' },
    fontFamily: { type: 'string' },
    fontSize: { type: 'string' },
    groupItems: {
      type: 'object',
      properties: {
        subItemsColor: { type: 'string' },
        textTransform: { type: 'string' },
        fontWeight: { type: 'string' },
      },
    },
    level1items: {
      type: 'object',
      properties: {
        textTransform: { type: 'string' },
      },
    },
    rightLineColor: { type: 'string' },
    separatorLabelColor: { type: 'string' },
    showAtBreakpoint: { type: 'string' },
    spacing: {
      type: 'object',
      properties: {
        unit: { type: 'number' },
        paddingHorizontal: { type: 'string' },
        paddingVertical: { type: 'string' },
        offsetTop: { type: 'string' },
        offsetLeft: { type: 'string' },
        offsetNesting: { type: 'string' },
      },
    },
    textColor: { type: 'string' },
    width: { type: 'string' },
  },
};

const Heading: NodeType = {
  properties: {
    color: { type: 'string' },
    fontFamily: { type: 'string' },
    fontSize: { type: 'string' },
    fontWeight: { type: 'string' },
    lineHeight: { type: 'string' },
    transform: { type: 'string' },
  },
};

const Typography: NodeType = {
  properties: {
    code: {
      type: 'object',
      properties: {
        backgroundColor: { type: 'string' },
        color: { type: 'string' },
        fontFamily: { type: 'string' },
        fontSize: { type: 'string' },
        fontWeight: { type: 'string' },
        lineHeight: { type: 'string' },
        wordBreak: { type: 'string' },
        wrap: { type: 'boolean' },
      },
    },
    fieldName: {
      type: 'object',
      properties: {
        fontFamily: { type: 'string' },
        fontSize: { type: 'string' },
        fontWeight: { type: 'string' },
        lineHeight: { type: 'string' },
      },
    },
    fontFamily: { type: 'string' },
    fontSize: { type: 'string' },
    fontWeightBold: { type: 'string' },
    fontWeightLight: { type: 'string' },
    fontWeightRegular: { type: 'string' },
    heading1: 'Heading',
    heading2: 'Heading',
    heading3: 'Heading',
    headings: {
      type: 'object',
      properties: {
        fontFamily: { type: 'string' },
        fontWeight: { type: 'string' },
        lineHeight: { type: 'string' },
      },
    },
    lineHeight: { type: 'string' },
    links: {
      type: 'object',
      properties: {
        color: { type: 'string' },
        hover: { type: 'string' },
        textDecoration: { type: 'string' },
        visited: { type: 'string' },
      },
    },
    optimizeSpeed: { type: 'boolean' },
    rightPanelHeading: 'Heading',
    smoothing: { type: 'string' },
  },
};

const ConfigTheme: NodeType = {
  properties: {
    breakpoints: {
      type: 'object',
      properties: {
        large: { type: 'string' },
        medium: { type: 'string' },
        small: { type: 'string' },
      },
    },
    codeBlock: {
      type: 'object',
      properties: {
        backgroundColor: { type: 'string' },
        borderRadius: { type: 'string' },
        tokens: {
          type: 'object',
          properties: {
            color: { type: 'string' },
            fontFamily: { type: 'string' },
            fontSize: { type: 'string' },
            lineHeight: { type: 'string' },
          },
        },
      },
    },
    colors: 'ThemeColors',
    components: 'Components',
    layout: 'Layout',
    logo: {
      type: 'object',
      properties: {
        gutter: { type: 'string' },
        maxHeight: { type: 'string' },
        maxWidth: { type: 'string' },
      },
    },
    overrides: {
      type: 'object',
      properties: {
        DownloadButton: {
          type: 'object',
          properties: {
            custom: { type: 'string' },
          },
        },
        NextSectionButton: {
          type: 'object',
          properties: {
            custom: { type: 'string' },
          },
        },
      },
    },
    rightPanel: {
      type: 'object',
      properties: {
        backgroundColor: { type: 'string' },
        panelBackgroundColor: { type: 'string' },
        panelControlsBackgroundColor: { type: 'string' },
        showAtBreakpoint: { type: 'string' },
        textColor: { type: 'string' },
        width: { type: 'string' },
      },
    },
    schema: 'Schema',
    shape: { type: 'object', properties: { borderRadius: { type: 'string' } } },
    sidebar: 'Sidebar',
    spacing: {
      type: 'object',
      properties: {
        sectionHorizontal: { type: 'number' },
        sectionVertical: { type: 'number' },
        unit: { type: 'number' },
      },
    },
    typography: 'Typography',
    links: { properties: { color: { type: 'string' } } },
    codeSample: { properties: { backgroundColor: { type: 'string' } } },
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

export const ConfigTypes: Record<string, NodeType> = {
  ConfigRoot,
  ConfigLint,
  ConfigReferenceDocs,
  ConfigHTTP,
  ConfigLanguage,
  ConfigLabels,
  ConfigSidebarLinks,
  ConfigTheme,
  ThemeColors,
  CommonThemeColors,
  CommonColorProps,
  SizeProps,
  Components,
  Layout,
  Schema,
  Sidebar,
  Heading,
  Typography,
};
