import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: [
      '**/__tests__/**',
      'packages/*/lib/**',
      '*.js',
      'packages/respect-core/src/modules/runtime-expressions/abnf-parser.js', // Generated file
    ],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsparser,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
    },
    rules: {
      // TypeScript ESLint recommended rules
      ...tseslint.configs.recommended.rules,
      // Custom overrides
      'no-undef': 'off', // TypeScript handles this better
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none', // Don't check unused catch clause variables
        },
      ],
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      // Note: @typescript-eslint/ban-types was removed in v8, replaced by @typescript-eslint/no-unsafe-function-type
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-prototype-builtins': 'off',
      'no-useless-escape': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
        },
      ],
      'import/order': [
        'error',
        {
          groups: [['builtin', 'external', 'parent', 'sibling', 'index', 'object'], ['type']],
          'newlines-between': 'always',
        },
      ],
      'import/no-duplicates': 'error',
    },
  },
];
