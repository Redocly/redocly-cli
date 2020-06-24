import { RulesConfig } from './config';

// export default {
//   rules: {
//     spec: 'error',
//     'operation-2xx-response': 'error',
//     'operation-operationId-unique': 'error',
//     'operation-parameters-unique': 'error',
//     'path-parameters-defined': 'error',
//     'no-example-value-and-externalValue': 'error',
//     'no-enum-type-mismatch': 'error',
//     'operation-tag-defined': 'off',
//     'no-path-trailing-slash': 'warning',
//     'operationId-valid-in-url': 'warning',
//     'path-declaration-must-exist': 'error',
//     'tags-alphabetical': 'off',
//     'no-server-example.com': 'warning',
//     'no-server-trailing-slash': 'warning',
//     'info-description': 'warning',
//     'tag-description': 'warning',
//     'info-contact': 'off',
//     'info-license': 'off',
//     'no-unused-components': 'warning',
//     'path-not-include-query': 'error',
//     'operation-singular-tag': 'warning',
//     'info-license-url': 'off',
//     'operation-security-defined': 'error',
//     'no-unresolved-refs': 'error',
//     'boolean-parameter-prefixes': 'warning',
//   },
// } as RulesConfig;

export default {
  rules: {
    'info-description': 'warning',
    'info-contact': 'off',
    'info-license': 'off',
    'info-license-url': 'off',

    'tag-description': 'warning',
    'tags-alphabetical': 'off',

    'no-server-example.com': 'warning',
    'no-server-trailing-slash': 'error',
    'no-empty-servers': 'warning',

    'parameter-description': 'off',
    'no-path-trailing-slash': 'error',
    'path-declaration-must-exist': 'error',
    'path-not-include-query': 'error',
    'path-parameters-defined': 'error',
    'operation-description': 'off',
    'operation-2xx-response': 'warning',
    'operation-operationId-unique': 'error',
    'operation-parameters-unique': 'error',
    'operation-tag-defined': 'warning',
    'operation-security-defined': 'warning',
    'operationId-valid-in-url': 'error',
    'operation-singular-tag': 'off',

    'no-example-value-and-externalValue': 'error',

    'no-unused-components': 'warning',
    'no-unresolved-refs': 'error',
    'no-enum-type-mismatch': 'error',

    'boolean-parameter-prefixes': 'off',
    'paths-kebab-case': 'off',
    spec: 'error',
  }
} as RulesConfig
