import { RulesConfig } from './config';

export default {
  rules: {
    'info-description': 'error',
    'info-contact': 'error',
    'info-license': 'error',
    'info-license-url': 'error',

    'tag-description': 'error',
    'tags-alphabetical': 'error',

    'no-server-example.com': 'error',
    'no-server-trailing-slash': 'error',
    'no-empty-servers': 'error',

    'parameter-description': 'error',
    'no-path-trailing-slash': 'error',
    'path-declaration-must-exist': 'error',
    'path-not-include-query': 'error',
    'path-parameters-defined': 'error',
    'operation-description': 'error',
    'operation-2xx-response': 'error',
    'operation-operationId-unique': 'error',
    'operation-operationId-valid-in-url': 'error',
    'operation-parameters-unique': 'error',
    'operation-tag-defined': 'error',
    'operation-security-defined': 'error',
    'operationId-valid-in-url': 'error',
    'operation-singular-tag': 'error',

    'no-example-value-and-externalValue': 'error',

    'no-unused-components': 'error',
    'no-unresolved-refs': 'error',
    'no-enum-type-mismatch': 'error',

    'boolean-parameter-prefixes': 'error',
    'paths-kebab-case': 'error',
    spec: 'error',
  },
} as RulesConfig;
