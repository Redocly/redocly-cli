import { LintRawConfig } from './config';

export default {
  rules: {
    'info-description': 'error',
    'info-contact': 'error',
    'info-license': 'error',
    'info-license-url': 'error',

    'tag-description': 'error',
    'tags-alphabetical': 'error',

    'parameter-description': 'error',
    'no-ambiguous-paths': 'error',
    'no-path-trailing-slash': 'error',
    'path-declaration-must-exist': 'error',
    'path-not-include-query': 'error',
    'path-parameters-defined': 'error',
    'operation-description': 'error',
    'operation-2xx-response': 'error',
    'operation-operationId': 'error',
    'operation-operationId-unique': 'error',
    'operation-operationId-url-safe': 'error',
    'operation-parameters-unique': 'error',
    'operation-tag-defined': 'error',
    'operation-security-defined': 'error',
    'operationId-valid-in-url': 'error',
    'operation-singular-tag': 'error',

    'no-unresolved-refs': 'error',
    'no-enum-type-mismatch': 'error',

    'boolean-parameter-prefixes': 'error',
    'paths-kebab-case': 'error',
    spec: 'error',
  },
  oas3_0Rules: {
    'no-invalid-media-type-examples': 'error',

    'no-server-example.com': 'error',
    'no-server-trailing-slash': 'error',
    'no-empty-servers': 'error',
    'no-example-value-and-externalValue': 'error',
    'no-unused-components': 'error',
    'no-undefined-server-variable': 'error',
  }
} as LintRawConfig;
