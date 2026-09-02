// Technical and product names that `capitalization` and `spelling` protect by
// default, unioned with each rule's own `exceptions`/`vocab`. Opt out with
// `builtinVocabulary: false`.
//
// Before adding an entry, note that two tests in __tests__/proper-nouns.test.ts
// reject most candidates and say why on failure: pure ALL-CAPS acronyms are
// already handled structurally by isAllCapsWord, and a word whose lowercase
// form is ordinary English would force-case ordinary prose. `curl` is the one
// entry deliberately admitted against that second rule, and the only entry
// whose as-written form is lowercase -- so a false hit force-LOWERCASES a
// capitalized `Curl`, where every other entry would force-capitalize.
//
// Alphabetized case-insensitively, duplicate-free (both enforced by test).
export const TECHNICAL_PROPER_NOUNS: readonly string[] = [
  'Android',
  'AsyncAPI',
  'Azure DevOps',
  'Bitbucket',
  'curl',
  'Docker',
  'ESLint',
  'Firefox',
  'GitHub',
  'GitHub Actions',
  'GitLab',
  'Google Cloud',
  'GraphiQL',
  'GraphQL',
  'iOS',
  'JavaScript',
  'Kubernetes',
  'Linux',
  'macOS',
  'Markdoc',
  'Node.js',
  'npm',
  'OAuth',
  'OpenAPI',
  'pnpm',
  'Redoc',
  'Redocly',
  'TypeScript',
  'Visual Studio Code',
  'VS Code',
  'Webpack',
];
