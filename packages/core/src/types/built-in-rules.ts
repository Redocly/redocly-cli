// Built-in rule definitions for OpenAPI, AsyncAPI, Arazzo, and Overlay specs
// These are kept in a separate file to allow tree-shaking when only type definitions are needed

export const builtInOAS2Rules = [
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

export type BuiltInOAS2RuleId = typeof builtInOAS2Rules[number];

export const builtInOAS3Rules = [
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
] as const;

export type BuiltInOAS3RuleId = typeof builtInOAS3Rules[number];

export const builtInAsync2Rules = [
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

export const builtInAsync3Rules = [
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

export type BuiltInAsync2RuleId = typeof builtInAsync2Rules[number];

export type BuiltInAsync3RuleId = typeof builtInAsync3Rules[number];

export const builtInArazzo1Rules = [
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
  'no-required-schema-properties-undefined',
  'no-enum-type-mismatch',
  'no-schema-type-mismatch',
] as const;

export type BuiltInArazzo1RuleId = typeof builtInArazzo1Rules[number];

export const builtInOverlay1Rules = ['info-contact'] as const;

export type BuiltInOverlay1RuleId = typeof builtInOverlay1Rules[number];

export const builtInCommonRules = ['struct', 'no-unresolved-refs'] as const;

export type BuiltInCommonRuleId = typeof builtInCommonRules[number];

export const builtInRules = [
  ...builtInOAS2Rules,
  ...builtInOAS3Rules,
  ...builtInAsync2Rules,
  ...builtInAsync3Rules,
  ...builtInArazzo1Rules,
  ...builtInOverlay1Rules,
  ...builtInCommonRules,
] as const;

export type BuiltInRuleId = typeof builtInRules[number];
