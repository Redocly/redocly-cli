// Technical and product names that `capitalization` and `spelling` accept by
// default, in addition to each rule's own `exceptions`/`vocab`. Turn this off
// with `builtinVocabulary: false`.
//
// Keep the list sorted case-insensitively with no duplicates (tests check this).
// Don't add all-caps acronyms or words that are also ordinary lowercase English;
// the tests reject them. `curl` is the one exception: it is the only entry
// written in lowercase, so `Curl` gets changed to `curl`.
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
