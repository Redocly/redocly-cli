import path from 'node:path';
import { listOf, mapOf } from './index.js';
import { specVersions, getTypes } from '../oas-types.js';
import { isCustomRuleId, omit } from '../utils.js';
import { getNodeTypesFromJSONSchema } from './json-schema-adapter.js';
import { normalizeTypes } from '../types/index.js';
import { isAbsoluteUrl } from '../ref-utils.js';
import { builtInRules } from './built-in-rules.js';

import type { JSONSchema } from 'json-schema-to-ts';
import type { NodeType, PropType } from './index.js';
import type { Config, RawGovernanceConfig } from '../config/index.js';

// Re-export types for backward compatibility
export type {
  BuiltInOAS2RuleId,
  BuiltInOAS3RuleId,
  BuiltInAsync2RuleId,
  BuiltInAsync3RuleId,
  BuiltInArazzo1RuleId,
  BuiltInOverlay1RuleId,
  BuiltInCommonRuleId,
  BuiltInRuleId,
} from './built-in-rules.js';

const configGovernanceProperties: Record<
  keyof RawGovernanceConfig,
  NodeType['properties'][string]
> = {
  extends: {
    name: 'ConfigGovernanceList',
    properties: {},
    items: (node) => {
      // check if it's preset name
      if (typeof node === 'string' && !isAbsoluteUrl(node) && !path.extname(node)) {
        return { type: 'string' };
      }
      return {
        ...ConfigGovernance,
        directResolveAs: { name: 'ConfigGovernance', ...ConfigGovernance },
      } as PropType;
    },
  } as PropType,
  plugins: { type: 'array', items: { type: 'string' } },

  rules: 'Rules',
  oas2Rules: 'Rules',
  oas3_0Rules: 'Rules',
  oas3_1Rules: 'Rules',
  oas3_2Rules: 'Rules',
  async2Rules: 'Rules',
  async3Rules: 'Rules',
  arazzo1Rules: 'Rules',
  overlay1Rules: 'Rules',
  preprocessors: { type: 'object' },
  oas2Preprocessors: { type: 'object' },
  oas3_0Preprocessors: { type: 'object' },
  oas3_1Preprocessors: { type: 'object' },
  oas3_2Preprocessors: { type: 'object' },
  async2Preprocessors: { type: 'object' },
  async3Preprocessors: { type: 'object' },
  arazzo1Preprocessors: { type: 'object' },
  overlay1Preprocessors: { type: 'object' },
  decorators: { type: 'object' },
  oas2Decorators: { type: 'object' },
  oas3_0Decorators: { type: 'object' },
  oas3_1Decorators: { type: 'object' },
  oas3_2Decorators: { type: 'object' },
  async2Decorators: { type: 'object' },
  async3Decorators: { type: 'object' },
  arazzo1Decorators: { type: 'object' },
  overlay1Decorators: { type: 'object' },
};

const ConfigGovernance: NodeType = {
  properties: configGovernanceProperties,
};

const createConfigRoot = (nodeTypes: Record<string, NodeType>): NodeType => ({
  ...nodeTypes.rootRedoclyConfigSchema,
  properties: {
    ...nodeTypes.rootRedoclyConfigSchema.properties,
    ...ConfigGovernance.properties,
    apis: 'ConfigApis', // Override apis with internal format
    telemetry: { enum: ['on', 'off'] },
    resolve: {
      properties: {
        http: 'ConfigHTTP',
        doNotResolveExamples: { type: 'boolean' },
      },
    },
  },
});

const ConfigApis: NodeType = {
  properties: {},
  additionalProperties: 'ConfigApisProperties',
};

const createConfigApisProperties = (nodeTypes: Record<string, NodeType>): NodeType => ({
  ...nodeTypes['rootRedoclyConfigSchema.apis_additionalProperties'],
  properties: {
    ...nodeTypes['rootRedoclyConfigSchema.apis_additionalProperties']?.properties,
    ...omit(ConfigGovernance.properties, ['plugins']), // plugins are not allowed in apis
  },
});

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

const Rules: NodeType = {
  properties: {},
  additionalProperties: (value: unknown, key: string) => {
    if (key.startsWith('rule/')) {
      if (typeof value === 'string') {
        return { enum: ['error', 'warn', 'off'] };
      } else {
        return 'Assert';
      }
    } else if ((builtInRules as readonly string[]).includes(key) || isCustomRuleId(key)) {
      if (typeof value === 'string') {
        return { enum: ['error', 'warn', 'off'] };
      } else {
        return 'ObjectRule';
      }
    } else if (key === 'metadata-schema' || key === 'custom-fields-schema') {
      return 'Schema';
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

// TODO: add better type tree for this
const Schema: NodeType = {
  properties: {
    properties: mapOf('Schema'),
  },
  additionalProperties: {},
};

function createAssertionDefinitionSubject(nodeNames: string[]): NodeType {
  return {
    properties: {
      type: {
        enum: [...new Set(['any', ...nodeNames, 'SpecExtension'])],
      },
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
}

function createScorecardLevelsItems(nodeTypes: Record<string, NodeType>): NodeType {
  return {
    ...nodeTypes['rootRedoclyConfigSchema.scorecard.levels_items'],
    properties: {
      ...nodeTypes['rootRedoclyConfigSchema.scorecard.levels_items']?.properties,
      ...configGovernanceProperties,
    },
  };
}

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
    if (/^\w+\/\w+$/.test(key)) return {};
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

export async function createConfigTypes(extraSchemas: JSONSchema, config?: Config) {
  const nodeNames = (
    await Promise.all(
      specVersions.map(async (version) => {
        const types = config
          ? config.extendTypes(await getTypes(version), version)
          : await getTypes(version);
        return Object.keys(types);
      })
    )
  ).flat();
  // Create types based on external schemas
  const nodeTypes = getNodeTypesFromJSONSchema('rootRedoclyConfigSchema', extraSchemas);

  return {
    ...CoreConfigTypes,
    ConfigRoot: createConfigRoot(nodeTypes), // This is the REAL config root type
    ConfigApisProperties: createConfigApisProperties(nodeTypes),
    AssertionDefinitionSubject: createAssertionDefinitionSubject(nodeNames),
    ...nodeTypes,
    'rootRedoclyConfigSchema.scorecard.levels_items': createScorecardLevelsItems(nodeTypes),
  };
}

const CoreConfigTypes: Record<string, NodeType> = {
  Assert,
  ConfigApis,
  ConfigGovernance,
  ConfigHTTP,
  AssertDefinition,
  ObjectRule,
  Schema,
  Rules,
  AssertionDefinitionAssertions,
};

// Lazy-loaded config types to support dynamic imports
let _configTypesPromise: Promise<Record<string, NodeType>> | null = null;
let _normalizedConfigTypes: ReturnType<typeof normalizeTypes> | null = null;

async function loadSchema(): Promise<JSONSchema> {
  const { rootRedoclyConfigSchema } = await import('@redocly/config');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore FIXME: remove this once we remove `theme` from the schema
  delete rootRedoclyConfigSchema.properties.theme;
  return rootRedoclyConfigSchema;
}

export function getConfigTypes(): Promise<Record<string, NodeType>> {
  if (!_configTypesPromise) {
    _configTypesPromise = loadSchema().then((schema) => createConfigTypes(schema));
  }
  return _configTypesPromise;
}

export async function getNormalizedConfigTypes() {
  if (!_normalizedConfigTypes) {
    const configTypes = await getConfigTypes();
    _normalizedConfigTypes = normalizeTypes(configTypes);
  }
  return _normalizedConfigTypes;
}
