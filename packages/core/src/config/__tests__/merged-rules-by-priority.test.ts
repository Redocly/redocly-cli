// import type { LintRawConfig, ResolvedLintRawConfig } from '../types';
// import { getLintRawConfigWithMergedContentByPriority } from '../load';

// describe('getLintRawConfigWithMergedContentByPriority', () => {
//   it('should priority rule in root config', () => {
//     const input: ResolvedLintRawConfig = {
//       rules: {
//         'tags-alphabetical': 'warn',
//       },
//       extends: [
//         {
//           rules: {
//             'tags-alphabetical': 'off',
//           },
//         },
//         {
//           rules: {
//             'tags-alphabetical': 'error',
//           },
//         },
//       ],
//     };

//     const result = {
//       extends: [],
//       rules: {
//         'tags-alphabetical': 'warn',
//       },
//       decorators: {},
//       preprocessors: {},
//       plugins: [],
//     };

//     expect(getLintRawConfigWithMergedContentByPriority(input)).toEqual(result);
//   });

//   it('should merge rules and priority rule in last config', () => {
//     const input: ResolvedLintRawConfig = {
//       extends: [
//         {
//           rules: {
//             'tags-alphabetical': 'error',
//           },
//         },
//         {
//           rules: {
//             'tags-alphabetical': 'off',
//           },
//         },
//       ],
//       rules: {
//         'no-unresolved-refs': 'warn',
//       },
//     };

//     const result = {
//       extends: [],
//       rules: {
//         'no-unresolved-refs': 'warn',
//         'tags-alphabetical': 'off',
//       },
//       decorators: {},
//       preprocessors: {},
//       plugins: [],
//     };

//     expect(getLintRawConfigWithMergedContentByPriority(input)).toEqual(result);
//   });

//   it(`
//     should override the above rules in extends with the below ones 
//     & override rules from the "extends" with top-level rules
//   `, () => {
//     const input: ResolvedLintRawConfig = {
//       extends: [
//         'minimal',
//         {
//           rules: {
//             'tags-alphabetical': 'warn',
//             'no-invalid-media-type-examples': 'warn',
//             'operation-description': 'warn',
//           },
//         },
//         {
//           extends: ['recommended'],
//           rules: {
//             'operation-description': 'error',
//           },
//         },
//       ],
//       rules: {
//         'tags-alphabetical': 'off',
//       },
//       plugins: ['./local-plugin.js'],
//     };

//     const result: LintRawConfig = {
//       extends: ['minimal', 'recommended'],
//       rules: {
//         'tags-alphabetical': 'off',
//         'no-invalid-media-type-examples': 'warn',
//         'operation-description': 'error',
//       },
//       preprocessors: {},
//       decorators: {},
//       plugins: ['./local-plugin.js'],
//     };
//     expect(getLintRawConfigWithMergedContentByPriority(input)).toEqual(result);
//   });

//   it('should work for an empty config', () => {
//     const input: ResolvedLintRawConfig = {};

//     const result: LintRawConfig = {
//       rules: {},
//       preprocessors: {},
//       decorators: {},
//       plugins: [],
//     };
//     expect(getLintRawConfigWithMergedContentByPriority(input)).toEqual(result);
//   });

//   //   TODO: test also other extends (like recommended), as well as plugins, decorators, preprocessors
// });
