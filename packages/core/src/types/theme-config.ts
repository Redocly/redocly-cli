import type { FromSchema } from 'json-schema-to-ts';

const logoConfigSchema = {
  type: 'object',
  properties: {
    image: { type: 'string' },
    srcSet: { type: 'string' },
    altText: { type: 'string' },
    link: { type: 'string' },
    favicon: { type: 'string' },
  },
  additionalProperties: false,
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

const markdownConfigSchema = {
  type: 'object',
  properties: {
    frontMatterKeysToResolve: {
      type: 'array',
      items: { type: 'string' },
      default: ['image', 'links'],
    },
    partialsFolders: {
      type: 'array',
      items: { type: 'string' },
      default: ['_partials'],
    },
    lastUpdatedBlock: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['timeago', 'iso', 'long', 'short'],
          default: 'timeago',
        },
        locale: { type: 'string' },
        ...hideConfigSchema.properties,
      },
      additionalProperties: false,
      default: {},
    },
    toc: {
      type: 'object',
      properties: {
        header: { type: 'string', default: 'On this page' },
        depth: { type: 'integer', default: 3, minimum: 1 },
        ...hideConfigSchema.properties,
      },
      additionalProperties: false,
      default: {},
    },
    editPage: {
      type: 'object',
      properties: {
        baseUrl: { type: 'string' },
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

const productGoogleAnalyticsConfigSchema = {
  type: 'object',
  properties: {
    includeInDevelopment: { type: 'boolean' },
    trackingId: { type: 'string' },

    conversionId: { type: 'string' },
    floodlightId: { type: 'string' },
    optimizeId: { type: 'string' },
    exclude: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
  required: ['trackingId'],
} as const;

const googleAnalyticsConfigSchema = {
  type: 'object',
  properties: {
    includeInDevelopment: { type: 'boolean' },
    trackingId: { type: 'string' },

    conversionId: { type: 'string' },
    floodlightId: { type: 'string' },

    head: { type: 'boolean' },
    respectDNT: { type: 'boolean' },
    exclude: { type: 'array', items: { type: 'string' } },

    optimizeId: { type: 'string' },
    anonymizeIp: { type: 'boolean' },
    cookieExpires: { type: 'number' },

    // All enabled tracking configs
    trackers: {
      type: 'object',
      additionalProperties: productGoogleAnalyticsConfigSchema,
    },
  },
  additionalProperties: false,
  required: ['trackingId'],
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
    disconnect: { type: 'boolean', default: false },
    group: { type: 'string' },
    label: { type: 'string' },
    separator: { type: 'string' },
    separatorLine: { type: 'boolean' },
    linePosition: {
      type: 'string',
      enum: ['top', 'bottom'],
      default: 'top',
    },
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

const productConfigSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    icon: { type: 'string' },
    folder: { type: 'string' },
  },
  additionalProperties: false,
  required: ['name', 'folder'],
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

const catalogFilterSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'property'],
  properties: {
    type: { type: 'string', enum: ['select', 'checkboxes', 'date-range'] },
    title: { type: 'string' },
    titleTranslationKey: { type: 'string' },
    property: { type: 'string' },
    parentFilter: { type: 'string' },
    valuesMapping: { type: 'object', additionalProperties: { type: 'string' } },
    missingCategoryName: { type: 'string' },
    missingCategoryNameTranslationKey: { type: 'string' },
    options: { type: 'array', items: { type: 'string' } },
  },
} as const;

const scorecardConfigSchema = {
  type: 'object',
  additionalProperties: true,
  required: [],
  properties: {
    ignoreNonCompliant: { type: 'boolean', default: false },
    teamMetadataProperty: {
      type: 'object',
      properties: {
        property: { type: 'string' },
        label: { type: 'string' },
        default: { type: 'string' },
      },
    },
    levels: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          color: { type: 'string' },
          extends: { type: 'array', items: { type: 'string' } },
          rules: {
            type: 'object',
            additionalProperties: {
              oneOf: [{ type: 'string' }, { type: 'object' }],
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

const catalogSchema = {
  type: 'object',
  additionalProperties: true,
  required: ['slug', 'items'],
  properties: {
    slug: { type: 'string' },
    filters: { type: 'array', items: catalogFilterSchema },
    groupByFirstFilter: { type: 'boolean' },
    filterValuesCasing: {
      type: 'string',
      enum: ['sentence', 'original', 'lowercase', 'uppercase'],
    },
    items: navItemsSchema,
    requiredPermission: { type: 'string' },
    separateVersions: { type: 'boolean' },
    title: { type: 'string' },
    titleTranslationKey: { type: 'string' },
    description: { type: 'string' },
    descriptionTranslationKey: { type: 'string' },
  },
} as const;

const catalogsConfigSchema = {
  type: 'object',
  patternProperties: {
    '.*': catalogSchema,
  },
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
    products: {
      type: 'object',
      additionalProperties: productConfigSchema,
    },
    footer: {
      type: 'object',
      properties: {
        items: navItemsSchema,
        copyrightText: { type: 'string' },
        logo: hideConfigSchema,
        ...hideConfigSchema.properties,
      },
      additionalProperties: false,
    },
    sidebar: {
      type: 'object',
      properties: {
        separatorLine: { type: 'boolean' },
        linePosition: {
          type: 'string',
          enum: ['top', 'bottom'],
          default: 'bottom',
        },
        ...hideConfigSchema.properties,
      },
      additionalProperties: false,
    },
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
          enum: ['rating', 'sentiment', 'comment', 'reasons', 'mood', 'scale'],
          default: 'sentiment',
        },
        settings: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            submitText: { type: 'string' },
            buttonText: { type: 'string' },
            component: {
              type: 'string',
              enum: ['radio', 'checkbox'],
              default: 'checkbox',
            },
            items: { type: 'array', items: { type: 'string' }, minItems: 1 },
            leftScaleLabel: { type: 'string' },
            rightScaleLabel: { type: 'string' },
            reasons: {
              type: 'object',
              properties: {
                hide: {
                  type: 'boolean',
                  default: false,
                },
                component: {
                  type: 'string',
                  enum: ['radio', 'checkbox'],
                  default: 'checkbox',
                },
                label: { type: 'string' },
                items: { type: 'array', items: { type: 'string' } },
              },
              additionalProperties: false,
            },
            comment: {
              type: 'object',
              properties: {
                hide: {
                  type: 'boolean',
                  default: false,
                },
                label: { type: 'string' },
                likeLabel: { type: 'string' },
                dislikeLabel: { type: 'string' },
                satisfiedLabel: { type: 'string' },
                neutralLabel: { type: 'string' },
                dissatisfiedLabel: { type: 'string' },
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
            text: { type: 'string', default: 'Next to {{label}}' },
            ...hideConfigSchema.properties,
          },
          additionalProperties: false,
          default: {},
        },
        previousButton: {
          type: 'object',
          properties: {
            text: { type: 'string', default: 'Back to {{label}}' },
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
        elementFormat: { type: 'string', default: 'icon' },
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
            tooltipText: { type: 'string' },
            buttonText: { type: 'string' },
            label: { type: 'string' },
            ...hideConfigSchema.properties,
          },
          additionalProperties: false,
          default: { hide: false },
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
    openapi: { type: 'object', additionalProperties: true }, // TODO: put the real schema here @Viacheslav
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
    versionPicker: {
      type: 'object',
      properties: {
        hide: { type: 'boolean' },
        showForUnversioned: {
          type: 'boolean',
        },
      },
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
    catalog: catalogsConfigSchema,
    scorecard: scorecardConfigSchema,
  },
  additionalProperties: true,
  default: {},
} as const;

export const productThemeOverrideSchema = {
  type: 'object',
  properties: {
    logo: themeConfigSchema.properties.logo,
    navbar: themeConfigSchema.properties.navbar,
    footer: themeConfigSchema.properties.footer,
    sidebar: themeConfigSchema.properties.sidebar,
    search: themeConfigSchema.properties.search,
    codeSnippet: themeConfigSchema.properties.codeSnippet,
    breadcrumbs: themeConfigSchema.properties.breadcrumbs,
    analytics: {
      type: 'object',
      properties: {
        ga: productGoogleAnalyticsConfigSchema,
      },
    },
  },
  additionalProperties: true,
  default: {},
} as const;

export type ThemeConfig = FromSchema<typeof themeConfigSchema>;

// TODO: cannot export  as it relies on external types
// export type ThemeUIConfig = ThemeConfig & {
//   auth?: {
//     // used by portal dev login emulator
//     idpsInfo?: {
//       idpId: string;
//       type: string; // AuthProviderType
//       title: string | undefined;
//     }[];
//     devLogin?: boolean;
//     loginUrls?: Record<string, string>;
//   };
//   search?: {
//     shortcuts?: string[];
//     suggestedPages?: any[];
//   };
//   breadcrumbs?: {
//     prefixItems?: ResolvedNavLinkItem[];
//   };
//   products?: {
//     [key: string]: ProductUiConfig;
//   };
// };

export type ProductConfig = FromSchema<typeof productConfigSchema>;

export type ProductGoogleAnalyticsConfig = FromSchema<typeof productGoogleAnalyticsConfigSchema>;
// TODO: cannot export  as it relies on external types
// export type ProductThemeOverrideConfig = Pick<
//   ThemeUIConfig,
//   'logo' | 'navbar' | 'footer' | 'sidebar' | 'search' | 'codeSnippet' | 'breadcrumbs'
// > & { analytics?: { ga?: ProductGoogleAnalyticsConfig } };
// export type ProductUiConfig = ProductConfig & {
//   slug: string;
//   link: string;
//   [REDOCLY_TEAMS_RBAC]?: { [key: string]: string };
//   themeOverride?: ProductThemeOverrideConfig;
// };

export type MarkdownConfig = FromSchema<typeof markdownConfigSchema>;

export type AmplitudeAnalyticsConfig = FromSchema<typeof amplitudeAnalyticsConfigSchema>;
export type RudderstackAnalyticsConfig = FromSchema<typeof rudderstackAnalyticsConfigSchema>;
export type SegmentAnalyticsConfig = FromSchema<typeof segmentAnalyticsConfigSchema>;
export type GtmAnalyticsConfig = FromSchema<typeof gtmAnalyticsConfigSchema>;
export type GoogleAnalyticsConfig = FromSchema<typeof googleAnalyticsConfigSchema>;
export type CatalogConfig = FromSchema<typeof catalogSchema>;
export type CatalogFilterConfig = FromSchema<typeof catalogFilterSchema>;
export type ScorecardConfig = FromSchema<typeof scorecardConfigSchema>;
