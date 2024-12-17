import type { PluginStyleguideConfig } from './types';

const recommendedStrict: PluginStyleguideConfig<'built-in'> = {
  rules: {
    struct: 'error',
  },
  oas2Rules: {
    'boolean-parameter-prefixes': 'off',
    'info-contact': 'off',
    'info-license': 'error',
    'info-license-url': 'off',
    'info-license-strict': 'error',
    'no-path-trailing-slash': 'error',
    'no-identical-paths': 'error',
    'no-ambiguous-paths': 'error',
    'no-invalid-schema-examples': 'off',
    'no-invalid-parameter-examples': 'off',
    'no-http-verbs-in-paths': 'off',
    'no-enum-type-mismatch': 'error',
    'no-unresolved-refs': 'error',
    'no-required-schema-properties-undefined': 'off',
    'operation-summary': 'error',
    'operation-operationId': 'error',
    'operation-operationId-unique': 'error',
    'operation-operationId-url-safe': 'error',
    'operation-description': 'off',
    'operation-2xx-response': 'error',
    'operation-4xx-response': 'error',
    'operation-parameters-unique': 'error',
    'operation-tag-defined': 'off',
    'operation-singular-tag': 'off',
    'parameter-description': 'off',
    'path-declaration-must-exist': 'error',
    'path-not-include-query': 'error',
    'path-parameters-defined': 'error',
    'paths-kebab-case': 'off',
    'path-excludes-patterns': 'off',
    'path-http-verbs-order': 'off',
    'path-params-defined': 'off',
    'path-segment-plural': 'off',
    'required-string-property-missing-min-length': 'off',
    'response-contains-header': 'off',
    'request-mime-type': 'off',
    'response-contains-property': 'off',
    'response-mime-type': 'off',
    'security-defined': 'error',
    'spec-strict-refs': 'off',
    'scalar-property-missing-example': 'off',
    'tag-description': 'error',
    'tags-alphabetical': 'off',
  },
  oas3_0Rules: {
    'array-parameter-serialization': 'off',
    'boolean-parameter-prefixes': 'off',
    'component-name-unique': 'off',
    'info-contact': 'off',
    'info-license': 'error',
    'info-license-url': 'off',
    'info-license-strict': 'error',
    'no-path-trailing-slash': 'error',
    'no-identical-paths': 'error',
    'no-ambiguous-paths': 'error',
    'no-invalid-schema-examples': 'off',
    'no-invalid-parameter-examples': 'off',
    'no-http-verbs-in-paths': 'off',
    'no-enum-type-mismatch': 'error',
    'no-unresolved-refs': 'error',
    'no-required-schema-properties-undefined': 'off',
    'no-invalid-media-type-examples': {
      severity: 'error',
      allowAdditionalProperties: false,
    },
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
    'operation-description': 'off',
    'operation-2xx-response': 'error',
    'operation-4xx-response': 'error',
    'operation-4xx-problem-details-rfc7807': 'off',
    'operation-parameters-unique': 'error',
    'operation-tag-defined': 'off',
    'operation-singular-tag': 'off',
    'parameter-description': 'off',
    'path-declaration-must-exist': 'error',
    'path-not-include-query': 'error',
    'path-parameters-defined': 'error',
    'paths-kebab-case': 'off',
    'path-excludes-patterns': 'off',
    'path-http-verbs-order': 'off',
    'path-params-defined': 'off',
    'path-segment-plural': 'off',
    'required-string-property-missing-min-length': 'off',
    'response-contains-header': 'off',
    'request-mime-type': 'off',
    'response-contains-property': 'off',
    'response-mime-type': 'off',
    'security-defined': 'error',
    'spec-strict-refs': 'off',
    'scalar-property-missing-example': 'off',
    'spec-components-invalid-map-name': 'error',
    'tag-description': 'error',
    'tags-alphabetical': 'off',
  },
  oas3_1Rules: {
    'array-parameter-serialization': 'off',
    'boolean-parameter-prefixes': 'off',
    'component-name-unique': 'off',
    'info-contact': 'off',
    'info-license': 'error',
    'info-license-url': 'off',
    'info-license-strict': 'error',
    'no-path-trailing-slash': 'error',
    'no-identical-paths': 'error',
    'no-ambiguous-paths': 'error',
    'no-invalid-schema-examples': 'off',
    'no-invalid-parameter-examples': 'off',
    'no-http-verbs-in-paths': 'off',
    'no-enum-type-mismatch': 'error',
    'no-unresolved-refs': 'error',
    'no-required-schema-properties-undefined': 'off',
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
    'operation-description': 'off',
    'operation-2xx-response': 'error',
    'operation-4xx-response': 'error',
    'operation-4xx-problem-details-rfc7807': 'off',
    'operation-parameters-unique': 'error',
    'operation-tag-defined': 'off',
    'operation-singular-tag': 'off',
    'parameter-description': 'off',
    'path-declaration-must-exist': 'error',
    'path-not-include-query': 'error',
    'path-parameters-defined': 'error',
    'paths-kebab-case': 'off',
    'path-excludes-patterns': 'off',
    'path-http-verbs-order': 'off',
    'path-params-defined': 'off',
    'path-segment-plural': 'off',
    'required-string-property-missing-min-length': 'off',
    'response-contains-header': 'off',
    'request-mime-type': 'off',
    'response-contains-property': 'off',
    'response-mime-type': 'off',
    'security-defined': 'error',
    'spec-strict-refs': 'off',
    'scalar-property-missing-example': 'off',
    'spec-components-invalid-map-name': 'error',
    'tag-description': 'error',
    'tags-alphabetical': 'off',
  },
  async2Rules: {
    'channels-kebab-case': 'off',
    'info-contact': 'off',
    'info-license-strict': 'error',
    'no-channel-trailing-slash': 'off',
    'operation-operationId': 'error',
    'tag-description': 'error',
    'tags-alphabetical': 'off',
  },
  async3Rules: {
    'channels-kebab-case': 'off',
    'info-contact': 'off',
    'info-license-strict': 'error',
    'no-channel-trailing-slash': 'off',
    'operation-operationId': 'error',
    'tag-description': 'error',
    'tags-alphabetical': 'off',
  },
  arazzo1Rules: {
    'criteria-unique': 'error',
    'no-criteria-xpath': 'error',
    'parameters-not-in-body': 'error',
    'parameters-unique': 'error',
    'requestBody-replacements-unique': 'error',
    'sourceDescription-type': 'error',
    'step-onSuccess-unique': 'error',
    'step-onFailure-unique': 'error',
    'stepId-unique': 'error',
    'sourceDescription-name-unique': 'error',
    'sourceDescriptions-not-empty': 'error',
    'version-enum': 'error',
    'workflowId-unique': 'error',
    'workflow-dependsOn': 'error',
  },
};

export default recommendedStrict;
