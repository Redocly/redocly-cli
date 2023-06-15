import type { PluginStyleguideConfig } from './types';

export default {
  rules: {
    'info-contact': 'off',
    'info-license': 'off',
    'info-license-url': 'off',
    'tag-description': 'warn',
    'tags-alphabetical': 'off',
    'parameter-description': 'off',
    'no-path-trailing-slash': 'warn',
    'no-identical-paths': 'warn',
    'no-ambiguous-paths': 'warn',
    'path-declaration-must-exist': 'warn',
    'path-not-include-query': 'warn',
    'path-parameters-defined': 'warn',
    'operation-description': 'off',
    'operation-2xx-response': 'warn',
    'operation-4xx-response': 'off',
    assertions: 'warn',
    'operation-operationId': 'warn',
    'operation-summary': 'warn',
    'operation-operationId-unique': 'warn',
    'operation-parameters-unique': 'warn',
    'operation-tag-defined': 'off',
    'security-defined': 'warn',
    'operation-operationId-url-safe': 'warn',
    'operation-singular-tag': 'off',
    'no-unresolved-refs': 'error',
    'no-enum-type-mismatch': 'warn',
    'boolean-parameter-prefixes': 'off',
    'paths-kebab-case': 'off',
    spec: 'error',
    'spec-strict-refs': 'off',
    'schema-name-unique': 'off',
    'parameter-name-unique': 'off',
  },
  oas3_0Rules: {
    'no-invalid-media-type-examples': {
      severity: 'warn',
      allowAdditionalProperties: false,
    },
    'no-server-example.com': 'warn',
    'no-server-trailing-slash': 'error',
    'no-empty-servers': 'warn',
    'no-example-value-and-externalValue': 'warn',
    'no-unused-components': 'warn',
    'no-undefined-server-variable': 'warn',
    'no-server-variables-empty-enum': 'error',
    'spec-components-invalid-map-name': 'warn',
  },
  oas3_1Rules: {
    'no-invalid-media-type-examples': 'warn',
    'no-server-example.com': 'warn',
    'no-server-trailing-slash': 'error',
    'no-empty-servers': 'warn',
    'no-example-value-and-externalValue': 'warn',
    'no-unused-components': 'warn',
    'no-undefined-server-variable': 'warn',
    'no-server-variables-empty-enum': 'error',
    'spec-components-invalid-map-name': 'warn',
  },
} as PluginStyleguideConfig;
