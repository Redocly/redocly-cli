import type { PluginStyleguideConfig } from './types';

const all: PluginStyleguideConfig<'built-in'> = {
  rules: {
    struct: 'error',
  },
  oas2Rules: {
    'boolean-parameter-prefixes': 'error',
    'info-contact': 'error',
    'info-license': 'error',
    'info-license-url': 'error',
    'info-license-strict': 'error',
    'no-path-trailing-slash': 'error',
    'no-identical-paths': 'error',
    'no-ambiguous-paths': 'error',
    'no-invalid-schema-examples': 'error',
    'no-invalid-parameter-examples': 'error',
    'no-http-verbs-in-paths': 'error',
    'no-enum-type-mismatch': 'error',
    'no-unresolved-refs': 'error',
    'no-required-schema-properties-undefined': 'error',
    'no-schema-type-mismatch': 'error',
    'operation-summary': 'error',
    'operation-operationId': 'error',
    'operation-operationId-unique': 'error',
    'operation-operationId-url-safe': 'error',
    'operation-description': 'error',
    'operation-2xx-response': 'error',
    'operation-4xx-response': 'error',
    'operation-parameters-unique': 'error',
    'operation-tag-defined': 'error',
    'operation-singular-tag': 'error',
    'parameter-description': 'error',
    'path-declaration-must-exist': 'error',
    'path-not-include-query': 'error',
    'path-parameters-defined': 'error',
    'paths-kebab-case': 'error',
    'path-excludes-patterns': {
      severity: 'error',
      patterns: [],
    },
    'path-http-verbs-order': 'error',
    'path-params-defined': 'error',
    'path-segment-plural': 'error',
    'required-string-property-missing-min-length': 'error',
    'response-contains-header': 'error',
    'request-mime-type': {
      severity: 'error',
      allowedValues: ['application/json'],
    },
    'response-mime-type': {
      severity: 'error',
      allowedValues: ['application/json'],
    },
    'response-contains-property': 'error',
    'security-defined': 'error',
    'spec-strict-refs': 'error',
    'scalar-property-missing-example': 'error',
    'tag-description': 'error',
    'tags-alphabetical': 'error',
  },
  oas3_0Rules: {
    'array-parameter-serialization': 'error',
    'boolean-parameter-prefixes': 'error',
    'component-name-unique': 'error',
    'info-contact': 'error',
    'info-license': 'error',
    'info-license-url': 'error',
    'info-license-strict': 'error',
    'no-path-trailing-slash': 'error',
    'no-identical-paths': 'error',
    'no-ambiguous-paths': 'error',
    'no-invalid-schema-examples': 'error',
    'no-invalid-parameter-examples': 'error',
    'no-http-verbs-in-paths': 'error',
    'no-enum-type-mismatch': 'error',
    'no-unresolved-refs': 'error',
    'no-required-schema-properties-undefined': 'error',
    'no-schema-type-mismatch': 'error',
    'no-invalid-media-type-examples': 'error',
    'no-server-example.com': 'error',
    'no-server-trailing-slash': 'error',
    'no-empty-servers': 'error',
    'no-example-value-and-externalValue': 'error',
    'no-unused-components': 'error',
    'no-undefined-server-variable': 'error',
    'no-server-variables-empty-enum': 'error',
    'operation-summary': 'error',
    'operation-operationId': 'error',
    'operation-operationId-unique': 'error',
    'operation-operationId-url-safe': 'error',
    'operation-description': 'error',
    'operation-2xx-response': 'error',
    'operation-4xx-response': 'error',
    'operation-4xx-problem-details-rfc7807': 'error',
    'operation-parameters-unique': 'error',
    'operation-tag-defined': 'error',
    'operation-singular-tag': 'error',
    'parameter-description': 'error',
    'path-declaration-must-exist': 'error',
    'path-not-include-query': 'error',
    'path-parameters-defined': 'error',
    'paths-kebab-case': 'error',
    'path-excludes-patterns': {
      severity: 'error',
      patterns: [],
    },
    'path-http-verbs-order': 'error',
    'path-params-defined': 'error',
    'path-segment-plural': 'error',
    'required-string-property-missing-min-length': 'error',
    'response-contains-header': 'error',
    'request-mime-type': {
      severity: 'error',
      allowedValues: ['application/json'],
    },
    'response-mime-type': {
      severity: 'error',
      allowedValues: ['application/json'],
    },
    'response-contains-property': 'error',
    'security-defined': 'error',
    'spec-strict-refs': 'error',
    'scalar-property-missing-example': 'error',
    'spec-components-invalid-map-name': 'error',
    'tag-description': 'error',
    'tags-alphabetical': 'error',
  },
  oas3_1Rules: {
    'array-parameter-serialization': 'error',
    'boolean-parameter-prefixes': 'error',
    'component-name-unique': 'error',
    'info-contact': 'error',
    'info-license': 'error',
    'info-license-url': 'error',
    'info-license-strict': 'error',
    'no-path-trailing-slash': 'error',
    'no-identical-paths': 'error',
    'no-ambiguous-paths': 'error',
    'no-invalid-schema-examples': 'error',
    'no-invalid-parameter-examples': 'error',
    'no-http-verbs-in-paths': 'error',
    'no-enum-type-mismatch': 'error',
    'no-unresolved-refs': 'error',
    'no-required-schema-properties-undefined': 'error',
    'no-schema-type-mismatch': 'error',
    'no-invalid-media-type-examples': 'error',
    'no-server-example.com': 'error',
    'no-server-trailing-slash': 'error',
    'no-empty-servers': 'error',
    'no-example-value-and-externalValue': 'error',
    'no-unused-components': 'error',
    'no-undefined-server-variable': 'error',
    'no-server-variables-empty-enum': 'error',
    'parameter-description': 'error',
    'path-declaration-must-exist': 'error',
    'path-not-include-query': 'error',
    'path-parameters-defined': 'error',
    'paths-kebab-case': 'error',
    'path-excludes-patterns': {
      severity: 'error',
      patterns: [],
    },
    'path-http-verbs-order': 'error',
    'path-params-defined': 'error',
    'path-segment-plural': 'error',
    'operation-summary': 'error',
    'operation-operationId': 'error',
    'operation-operationId-unique': 'error',
    'operation-operationId-url-safe': 'error',
    'operation-description': 'error',
    'operation-2xx-response': 'error',
    'operation-4xx-response': 'error',
    'operation-4xx-problem-details-rfc7807': 'error',
    'operation-parameters-unique': 'error',
    'operation-tag-defined': 'error',
    'operation-singular-tag': 'error',
    'required-string-property-missing-min-length': 'error',
    'response-contains-header': 'error',
    'request-mime-type': {
      severity: 'error',
      allowedValues: ['application/json'],
    },
    'response-mime-type': {
      severity: 'error',
      allowedValues: ['application/json'],
    },
    'response-contains-property': 'error',
    'security-defined': 'error',
    'spec-strict-refs': 'error',
    'scalar-property-missing-example': 'error',
    'spec-components-invalid-map-name': 'error',
    'tag-description': 'error',
    'tags-alphabetical': 'error',
  },
  async2Rules: {
    'channels-kebab-case': 'error',
    'info-contact': 'error',
    'info-license-strict': 'error',
    'no-channel-trailing-slash': 'error',
    'operation-operationId': 'error',
    'tag-description': 'error',
    'tags-alphabetical': 'error',
  },
  async3Rules: {
    'channels-kebab-case': 'error',
    'info-contact': 'error',
    'info-license-strict': 'error',
    'no-channel-trailing-slash': 'error',
    'operation-operationId': 'error',
    'tag-description': 'error',
    'tags-alphabetical': 'error',
  },
  arazzo1Rules: {
    'criteria-unique': 'error',
    'no-criteria-xpath': 'off',
    'parameters-unique': 'error',
    'requestBody-replacements-unique': 'error',
    'sourceDescription-type': 'error',
    'step-onSuccess-unique': 'error',
    'step-onFailure-unique': 'error',
    'stepId-unique': 'error',
    'sourceDescription-name-unique': 'error',
    'sourceDescriptions-not-empty': 'error',
    'spot-supported-versions': 'off',
    'workflowId-unique': 'error',
    'workflow-dependsOn': 'error',
  },
};

export default all;
