// Fixture for markdoc-schema.test.ts case 6: a `.js`-suffixed relative
// specifier resolving to a sibling `.ts` file, the same NodeNext-style
// import TypeScript source commonly uses (see
// scripts/generate-markdoc-schema.mjs's own comment on why it needs `tsx`
// rather than plain Node for packages/portal's tag modules). Plain Node's
// module resolution has no bundler-style extension mapping and fails to find
// `helper.js`, regardless of whether its type-stripping can parse TS syntax;
// tsx's resolution does the mapping, so this import succeeds under tsx and
// fails under plain Node either way.
export { tags } from './helper.js';
