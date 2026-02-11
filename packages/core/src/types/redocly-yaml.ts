import path from 'node:path';
import { rootRedoclyConfigSchema } from '@redocly/config';
import { listOf, mapOf } from './index.js';
import { specVersions, getTypes } from '../oas-types.js';
import { isCustomRuleId } from '../utils/is-custom-rule-id.js';
import { omit } from '../utils/omit.js';
import { getNodeTypesFromJSONSchema } from './json-schema-adapter.js';
import { normalizeTypes } from '../types/index.js';
import { isAbsoluteUrl } from '../ref-utils.js';

import type { JSONSchema } from 'json-schema-to-ts';
import type { NodeType, PropType } from './index.js';
import type { Config, RawGovernanceConfig } from '../config/index.js';

const builtInOAS2Rules = [
  'info-contact',
  'operation-operationId',
  'tag-description',
  'tags-alphabetical',
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
  'no-required-schema-properties-undefined',
  'no-schema-type-mismatch',
  'boolean-parameter-prefixes',
  'request-mime-type',
  'response-contains-property',
  'response-mime-type',
  'no-duplicated-tag-names',
] as const;

export type BuiltInOAS2RuleId = (typeof builtInOAS2Rules)[number];

const builtInOAS3Rules = [
  'info-contact',
  'operation-operationId',
  'tag-description',
  'tags-alphabetical',
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
  'no-duplicated-tag-names',
  'nullable-type-sibling',
  'spec-no-invalid-tag-parents',
  'spec-no-invalid-encoding-combinations',
  'spec-discriminator-defaultMapping',
  'spec-example-values',
  'spec-querystring-parameters',
] as const;

export type BuiltInOAS3RuleId = (typeof builtInOAS3Rules)[number];

const builtInAsync2Rules = [
  'info-contact',
  'info-license-strict',
  'operation-operationId',
  'tag-description',
  'tags-alphabetical',
  'channels-kebab-case',
  'no-channel-trailing-slash',
  'no-duplicated-tag-names',
  'no-required-schema-properties-undefined',
  'no-enum-type-mismatch',
  'no-schema-type-mismatch',
] as const;

const builtInAsync3Rules = [
  'info-contact',
  'info-license-strict',
  'operation-operationId',
  'tag-description',
  'tags-alphabetical',
  'channels-kebab-case',
  'no-channel-trailing-slash',
  'no-duplicated-tag-names',
  'no-required-schema-properties-undefined',
  'no-enum-type-mismatch',
  'no-schema-type-mismatch',
] as const;

export type BuiltInAsync2RuleId = (typeof builtInAsync2Rules)[number];

export type BuiltInAsync3RuleId = (typeof builtInAsync3Rules)[number];

const builtInArazzo1Rules = [
  'sourceDescription-type',
  'workflowId-unique',
  'stepId-unique',
  'sourceDescription-name-unique',
  'sourceDescriptions-not-empty',
  'workflow-dependsOn',
  'outputs-defined',
  'parameters-unique',
  'step-onSuccess-unique',
  'step-onFailure-unique',
  'respect-supported-versions',
  'requestBody-replacements-unique',
  'no-criteria-xpath',
  'criteria-unique',
  'no-x-security-scheme-name-without-openapi',
  'x-security-scheme-required-values',
  'no-x-security-both-scheme-and-scheme-name',
  'no-required-schema-properties-undefined',
  'no-enum-type-mismatch',
  'no-schema-type-mismatch',
  'x-security-scheme-name-reference',
] as const;

export type BuiltInArazzo1RuleId = (typeof builtInArazzo1Rules)[number];

const builtInOverlay1Rules = ['info-contact'] as const;

export type BuiltInOverlay1RuleId = (typeof builtInOverlay1Rules)[number];

const builtInOpenRpc1Rules = [
  'info-contact',
  'info-license',
  'no-unused-components',
  'spec-no-duplicated-method-params',
  'spec-no-required-params-after-optional',
] as const;

export type BuiltInOpenRpc1RuleId = (typeof builtInOpenRpc1Rules)[number];

const builtInCommonRules = ['struct', 'no-unresolved-refs'] as const;

export type BuiltInCommonRuleId = (typeof builtInCommonRules)[number];

const builtInRules = [
  ...builtInOAS2Rules,
  ...builtInOAS3Rules,
  ...builtInAsync2Rules,
  ...builtInAsync3Rules,
  ...builtInArazzo1Rules,
  ...builtInOverlay1Rules,
  ...builtInOpenRpc1Rules,
  ...builtInCommonRules,
] as const;

type BuiltInRuleId = (typeof builtInRules)[number];

const configGovernanceProperties: Record<
  keyof RawGovernanceConfig,
  NodeType['properties'][string]
> = {
  extends: {
    name: 'ConfigRoot.extends',
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
    description:
      'The extends configuration entry allows your project configuration to extend an existing configuration set.',
    documentationLink: 'https://redocly.com/docs/cli/configuration/reference/extends#extends',
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
  openrpc1Rules: 'Rules',
  preprocessors: { type: 'object' },
  oas2Preprocessors: { type: 'object' },
  oas3_0Preprocessors: { type: 'object' },
  oas3_1Preprocessors: { type: 'object' },
  oas3_2Preprocessors: { type: 'object' },
  async2Preprocessors: { type: 'object' },
  async3Preprocessors: { type: 'object' },
  arazzo1Preprocessors: { type: 'object' },
  overlay1Preprocessors: { type: 'object' },
  openrpc1Preprocessors: { type: 'object' },
  decorators: { type: 'object' },
  oas2Decorators: { type: 'object' },
  oas3_0Decorators: { type: 'object' },
  oas3_1Decorators: { type: 'object' },
  oas3_2Decorators: { type: 'object' },
  async2Decorators: { type: 'object' },
  async3Decorators: { type: 'object' },
  arazzo1Decorators: { type: 'object' },
  overlay1Decorators: { type: 'object' },
  openrpc1Decorators: { type: 'object' },
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
  documentationLink: 'https://redocly.com/docs/cli/configuration/reference/rules#rules',
  description:
    'The rules configuration blocks configure linting rules and their severity. Configure built-in rules included by default, configurable rules you add yourself, and rules from plugins.',
  additionalProperties: (value: unknown, key: string) => {
    if (key.startsWith('rule/')) {
      if (typeof value === 'string') {
        return { enum: ['error', 'warn', 'off'] };
      } else {
        return 'ConfigurableRule';
      }
    } else if (builtInRules.includes(key as BuiltInRuleId) || isCustomRuleId(key)) {
      if (typeof value === 'string') {
        return { enum: ['error', 'warn', 'off'] };
      } else {
        return 'BuiltinRule';
      }
    } else if (key === 'metadata-schema' || key === 'custom-fields-schema') {
      return 'Schema';
    }
    // Otherwise is considered as invalid
    return;
  },
};

const BuiltinRule: NodeType = {
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
        description: 'REQUIRED. Locates the OpenAPI node type that the lint command evaluates.',
      },
      property: (value: unknown) => {
        if (Array.isArray(value)) {
          return {
            type: 'array',
            items: { type: 'string' },
            description:
              'Property name corresponding to the OpenAPI node type. If a list of properties is provided, assertions evaluate against each property in the sequence. If not provided (or null), assertions evaluate against the key names for the subject node type.',
            documentationLink:
              'https://redocly.com/docs/cli/rules/configurable-rules#property-example',
          };
        } else if (value === null) {
          return null;
        } else {
          return {
            type: 'string',
            description:
              'Property name corresponding to the OpenAPI node type. If a list of properties is provided, assertions evaluate against each property in the sequence. If not provided (or null), assertions evaluate against the key names for the subject node type.',
            documentationLink:
              'https://redocly.com/docs/cli/rules/configurable-rules#property-example',
          };
        }
      },
      filterInParentKeys: {
        type: 'array',
        items: { type: 'string' },
        description: `The name of the subject's parent key that locates where assertions run. An example value given the subject Operation could be filterInParentKeys: [get, put] means that only GET and PUT operations are evaluated for the assertions.`,
        documentationLink:
          'https://redocly.com/docs/cli/rules/configurable-rules#mutuallyrequired-example',
      },
      filterOutParentKeys: {
        type: 'array',
        items: { type: 'string' },
        description: `The name of the subject's parent key that excludes where assertions run. An example value given the subject Operation could be filterOutParentKeys: [delete] means that all operations except DELETE operations are evaluated for the assertions.`,
      },
      matchParentKeys: {
        type: 'string',
        description: `Applies a regex pattern to the subject's parent keys to determine where assertions run. An example value given the subject Operation could be matchParentKeys: /^p/ means that POST, PUT, and PATCH operations are evaluated for the assertions.`,
      },
    },
    required: ['type'],
    documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#subject-object',
    description:
      'REQUIRED. Narrows the subject further by specifying its type, and optionally property, filterParentKeys, etc.',
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

const Assertions: NodeType = {
  properties: {
    enum: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Asserts a value is within a predefined list of values. Providing a single value in a list is an equality check.',
      documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#enum-example',
    },
    pattern: {
      type: 'string',
      description: 'Asserts a value matches a regex pattern.',
      documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#pattern-example',
    },
    notPattern: {
      type: 'string',
      description: `Asserts a value doesn't match a regex pattern.`,
      documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#notpattern-example',
    },
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
      description:
        'Asserts a casing style. Supported styles are: camelCase, kebab-case, snake_case, PascalCase, MACRO_CASE, COBOL-CASE, flatcase.',
      documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#casing-example',
    },
    mutuallyExclusive: {
      type: 'array',
      items: { type: 'string' },
      description: 'Asserts that listed properties (key names only) are mutually exclusive.',
      documentationLink:
        'https://redocly.com/docs/cli/rules/configurable-rules#mutuallyexclusive-example',
    },
    mutuallyRequired: {
      type: 'array',
      items: { type: 'string' },
      description: 'Asserts that listed properties (key names only) are mutually required.',
      documentationLink:
        'https://redocly.com/docs/cli/rules/configurable-rules#mutuallyrequired-example',
    },
    required: {
      type: 'array',
      items: { type: 'string' },
      description: 'Asserts all listed values are defined.',
      documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#required-example',
    },
    requireAny: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Asserts that at least one of the listed properties (key names only) is defined. ',
      documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#requireany-example',
    },
    disallowed: {
      type: 'array',
      items: { type: 'string' },
      description: 'Asserts all listed values are not defined.',
      documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#disallowed-example',
    },
    defined: {
      type: 'boolean',
      description: 'Asserts a property is defined.',
      documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#defined-example',
    },
    nonEmpty: {
      type: 'boolean',
      description: 'Asserts a property is not empty.',
      documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#nonempty-example',
    },
    minLength: {
      type: 'integer',
      description: 'Asserts a minimum length (inclusive) of a string or list (array).',
      documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#minlength-example',
    },
    maxLength: {
      type: 'integer',
      description: 'Asserts a maximum length (inclusive) of a string or list (array).',
      documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#maxlength-example',
    },
    ref: (value: string | boolean) =>
      typeof value === 'string'
        ? {
            type: 'string',
            description: `Asserts a reference object presence in object's property. A boolean value of true means the property has a $ref defined. A boolean value of false means the property has not defined a $ref (it has an in-place value). A string value means that the $ref is defined and the unresolved value must match the pattern (for example, '/paths/.*.yaml$/').`,
            documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#ref-example',
          }
        : {
            type: 'boolean',
            description: `Asserts a reference object presence in object's property. A boolean value of true means the property has a $ref defined. A boolean value of false means the property has not defined a $ref (it has an in-place value). A string value means that the $ref is defined and the unresolved value must match the pattern (for example, '/paths/.*.yaml$/').`,
            documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#ref-example',
          },
    const: (value: string | boolean | number) => {
      if (typeof value === 'string') {
        return {
          type: 'string',
          description:
            'Asserts equality of a value. The behavior is the same as the enum assertion with exactly one value.',
          documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#const-example',
        };
      }
      if (typeof value === 'number') {
        return {
          type: 'number',
          description:
            'Asserts equality of a value. The behavior is the same as the enum assertion with exactly one value.',
          documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#const-example',
        };
      }
      if (typeof value === 'boolean') {
        return {
          type: 'boolean',
          description:
            'Asserts equality of a value. The behavior is the same as the enum assertion with exactly one value.',
          documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#const-example',
        };
      } else {
        return;
      }
    },
  },
  additionalProperties: (_value: unknown, key: string) => {
    if (/^\w+\/\w+$/.test(key)) return {};
    return;
  },
  documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#assertion-object',
  description: 'A minimum of one assertion property is required to be defined.',
};

const Where: NodeType = {
  properties: {
    subject: 'Subject',
    assertions: 'Assertions',
  },
  required: ['subject', 'assertions'],
  documentationLink: 'https://redocly.com/docs/cli/rules/configurable-rules#where-object',
  description:
    'The where object is part of a where list which must be defined in order from the root node. Each node can only be used in one where object for each assertion. Each subsequent node must be a descendant of the previous one. Rules that use multiple where objects must target each one on a different node. However, the same node could be used in the last where object and in the root subject object. Nodes may be skipped in between the subject node types of the where list and those defined in the root subject type.',
};

const ConfigurableRule: NodeType = {
  properties: {
    subject: 'Subject',
    assertions: 'Assertions',
    where: listOf('Where'),
    message: { type: 'string' },
    suggest: { type: 'array', items: { type: 'string' } },
    severity: { enum: ['error', 'warn', 'off'] },
  },
  required: ['subject', 'assertions'],
  documentationLink:
    'https://redocly.com/docs/cli/rules/configurable-rules#configurable-rule-object',
  description:
    'Configurable rule definitions enforce your custom API design standards. Add or edit your configurable rules in the configuration file. A configurable rule is a rule that starts with a rule/ prefix followed by a unique rule name. Rule names display in the lint log if the assertions fail. More than one configurable rule may be defined, and any configurable rule may have multiple assertions.',
};

export function createConfigTypes(extraSchemas: JSONSchema, config?: Config) {
  const nodeNames = specVersions.flatMap((version) => {
    const types = config ? config.extendTypes(getTypes(version), version) : getTypes(version);
    return Object.keys(types);
  });
  // Create types based on external schemas
  const { ctx: nodeTypes } = getNodeTypesFromJSONSchema('rootRedoclyConfigSchema', extraSchemas);

  return {
    ...CoreConfigTypes,
    ConfigRoot: createConfigRoot(nodeTypes), // This is the REAL config root type
    ConfigApisProperties: createConfigApisProperties(nodeTypes),
    Subject: createAssertionDefinitionSubject(nodeNames),
    ...nodeTypes,
    'rootRedoclyConfigSchema.scorecard.levels_items': createScorecardLevelsItems(nodeTypes),
  };
}

const CoreConfigTypes: Record<string, NodeType> = {
  ConfigurableRule,
  ConfigApis,
  ConfigGovernance,
  ConfigHTTP,
  Where,
  BuiltinRule,
  Schema,
  Rules,
  Assertions,
};

// FIXME: remove this once we remove `theme` from the schema
const { theme: _, ...propertiesWithoutTheme } = rootRedoclyConfigSchema.properties;
const redoclyConfigSchemaWithoutTheme = {
  ...rootRedoclyConfigSchema,
  properties: propertiesWithoutTheme,
};

export const ConfigTypes: Record<string, NodeType> = createConfigTypes(
  redoclyConfigSchemaWithoutTheme
);
export const NormalizedConfigTypes = normalizeTypes(ConfigTypes);
