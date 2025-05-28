import { rootRedoclyConfigSchema } from '@redocly/config';
import { listOf } from './index.js';
import { SpecVersion, getTypes } from '../oas-types.js';
import { isCustomRuleId } from '../utils.js';
import { getNodeTypesFromJSONSchema } from './json-schema-adapter.js';
import { normalizeTypes } from '../types/index.js';

import type { JSONSchema } from 'json-schema-to-ts';
import type { NodeType } from './index.js';
import type { Config } from '../config/index.js';

const builtInOAS2Rules = [
  'info-contact',
  'operation-operationId',
  'tag-description',
  'tags-alphabetical',
  'info-license-url',
  'info-license-strict',
  'info-license',
  'no-ambiguous-paths',
  'no-enum-type-mismatch',
  'no-http-verbs-in-paths',
  'no-identical-paths',
  'no-invalid-parameter-examples',
  'no-invalid-schema-examples',
  'no-path-trailing-slash',
  'operation-2xx-response',
  'operation-4xx-response',
  'operation-description',
  'operation-operationId-unique',
  'operation-operationId-url-safe',
  'operation-parameters-unique',
  'operation-singular-tag',
  'operation-summary',
  'operation-tag-defined',
  'parameter-description',
  'path-declaration-must-exist',
  'path-excludes-patterns',
  'path-http-verbs-order',
  'path-not-include-query',
  'path-params-defined',
  'path-parameters-defined',
  'path-segment-plural',
  'paths-kebab-case',
  'required-string-property-missing-min-length',
  'response-contains-header',
  'scalar-property-missing-example',
  'security-defined',
  'spec-strict-refs',
  'no-unresolved-refs',
  'no-required-schema-properties-undefined',
  'no-schema-type-mismatch',
  'boolean-parameter-prefixes',
  'request-mime-type',
  'response-contains-property',
  'response-mime-type',
] as const;

export type BuiltInOAS2RuleId = typeof builtInOAS2Rules[number];

const builtInOAS3Rules = [
  'info-contact',
  'operation-operationId',
  'tag-description',
  'tags-alphabetical',
  'info-license-url',
  'info-license-strict',
  'info-license',
  'no-ambiguous-paths',
  'no-enum-type-mismatch',
  'no-http-verbs-in-paths',
  'no-identical-paths',
  'no-invalid-parameter-examples',
  'no-invalid-schema-examples',
  'no-path-trailing-slash',
  'operation-2xx-response',
  'operation-4xx-response',
  'operation-description',
  'operation-operationId-unique',
  'operation-operationId-url-safe',
  'operation-parameters-unique',
  'operation-singular-tag',
  'operation-summary',
  'operation-tag-defined',
  'parameter-description',
  'path-declaration-must-exist',
  'path-excludes-patterns',
  'path-http-verbs-order',
  'path-not-include-query',
  'path-params-defined',
  'path-parameters-defined',
  'path-segment-plural',
  'paths-kebab-case',
  'required-string-property-missing-min-length',
  'response-contains-header',
  'scalar-property-missing-example',
  'security-defined',
  'spec-strict-refs',
  'no-unresolved-refs',
  'no-required-schema-properties-undefined',
  'no-schema-type-mismatch',
  'boolean-parameter-prefixes',
  'component-name-unique',
  'no-empty-servers',
  'no-example-value-and-externalValue',
  'no-invalid-media-type-examples',
  'no-server-example.com',
  'no-server-trailing-slash',
  'no-server-variables-empty-enum',
  'no-undefined-server-variable',
  'no-unused-components',
  'operation-4xx-problem-details-rfc7807',
  'request-mime-type',
  'response-contains-property',
  'response-mime-type',
  'spec-components-invalid-map-name',
  'array-parameter-serialization',
] as const;

export type BuiltInOAS3RuleId = typeof builtInOAS3Rules[number];

const builtInAsync2Rules = [
  'info-contact',
  'info-license-strict',
  'operation-operationId',
  'tag-description',
  'tags-alphabetical',
  'channels-kebab-case',
  'no-channel-trailing-slash',
] as const;

const builtInAsync3Rules = [
  'info-contact',
  'info-license-strict',
  'operation-operationId',
  'tag-description',
  'tags-alphabetical',
  'channels-kebab-case',
  'no-channel-trailing-slash',
] as const;

export type BuiltInAsync2RuleId = typeof builtInAsync2Rules[number];

export type BuiltInAsync3RuleId = typeof builtInAsync3Rules[number];

const builtInArazzo1Rules = [
  'sourceDescription-type',
  'workflowId-unique',
  'stepId-unique',
  'sourceDescription-name-unique',
  'sourceDescriptions-not-empty',
  'workflow-dependsOn',
  'parameters-unique',
  'step-onSuccess-unique',
  'step-onFailure-unique',
  'respect-supported-versions',
  'requestBody-replacements-unique',
  'no-criteria-xpath',
  'criteria-unique',
  'no-x-security-scheme-name-without-openapi',
  'x-security-scheme-required-values',
  'no-x-security-scheme-name-in-workflow',
] as const;

export type BuiltInArazzo1RuleId = typeof builtInArazzo1Rules[number];

const builtInOverlay1Rules = ['info-contact'] as const;

export type BuiltInOverlay1RuleId = typeof builtInOverlay1Rules[number];

const builtInRules = [
  ...builtInOAS2Rules,
  ...builtInOAS3Rules,
  ...builtInAsync2Rules,
  ...builtInAsync3Rules,
  ...builtInArazzo1Rules,
  ...builtInOverlay1Rules,
  'struct',
] as const;

type BuiltInRuleId = typeof builtInRules[number];

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
    async2Rules: 'Rules',
    arazzo1Rules: 'Rules',
    preprocessors: { type: 'object' },
    oas2Preprocessors: { type: 'object' },
    oas3_0Preprocessors: { type: 'object' },
    oas3_1Preprocessors: { type: 'object' },
    async2Preprocessors: { type: 'object' },
    arazzoPreprocessors: { type: 'object' },
    decorators: { type: 'object' },
    oas2Decorators: { type: 'object' },
    oas3_0Decorators: { type: 'object' },
    oas3_1Decorators: { type: 'object' },
    async2Decorators: { type: 'object' },
    arazzo1Decorators: { type: 'object' },
  },
};

const createConfigRoot = (nodeTypes: Record<string, NodeType>): NodeType => ({
  ...nodeTypes.rootRedoclyConfigSchema,
  properties: {
    ...nodeTypes.rootRedoclyConfigSchema.properties,
    ...ConfigStyleguide.properties,
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
    ...ConfigStyleguide.properties,
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
    } else if (builtInRules.includes(key as BuiltInRuleId) || isCustomRuleId(key)) {
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
  properties: {},
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

export function createConfigTypes(extraSchemas: JSONSchema, config?: Config) {
  const nodeNames = Object.values(SpecVersion).flatMap((version) => {
    const types = config?.styleguide
      ? config.styleguide.extendTypes(getTypes(version), version)
      : getTypes(version);
    return Object.keys(types);
  });
  // Create types based on external schemas
  const nodeTypes = getNodeTypesFromJSONSchema('rootRedoclyConfigSchema', extraSchemas);

  return {
    ...CoreConfigTypes,
    ConfigRoot: createConfigRoot(nodeTypes), // This is the REAL config root type
    ConfigApisProperties: createConfigApisProperties(nodeTypes),
    AssertionDefinitionSubject: createAssertionDefinitionSubject(nodeNames),
    ...nodeTypes,
  };
}

const CoreConfigTypes: Record<string, NodeType> = {
  Assert,
  ConfigApis,
  ConfigStyleguide,
  ConfigHTTP,
  AssertDefinition,
  ObjectRule,
  Schema,
  Rules,
  AssertionDefinitionAssertions,
};

export const ConfigTypes: Record<string, NodeType> = createConfigTypes(rootRedoclyConfigSchema);
export const NormalizedConfigTypes = normalizeTypes(ConfigTypes);
