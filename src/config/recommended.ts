import { RulesConfig } from './config';

export default {
  rules: {
    schema: 'error',
    'operation-2xx-response': 'error',
    'operation-operationId-unique': 'error',
    'operation-parameters-unique': 'error',
    'path-parameters-defined': 'error',
    'example-value-or-external-value': 'error',
    'typed-enum': 'error',
    'operation-tag-defined': 'off',
    'path-no-trailing-slashes': 'warning',
    'operationId-valid-in-url': 'warning',
    'path-declaration-must-exist': 'error',
    'openapi-tags-alphabetical': 'off',
    'server-not-example.com': 'warning',
    'server-trailing-slash': 'warning',
    'info-contact': 'off',
    'info-license': 'off',
    'no-unused-schemas': 'warning',
    'path-not-include-query': 'error',
    'operation-singular-tag': 'warning',
    'operation-security-defined': 'error',
    'no-unresolved-refs': 'error',
    'boolean-parameter-prefixes': 'warning',
    'no-empty-string': {
      severity: 'warning',
      options: {
        'Info.description': true,
        'Tag.description': true,
        'License.url': false,
      }
    },
  },
} as RulesConfig;
