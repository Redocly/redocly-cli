// Type declarations for the plain-JavaScript generator beside this file.
// The repo compiles with `allowJs: false`, so `examples-drift.test.ts` --
// which shares `examplePath`/`renderExample` with the generator rather than
// reimplementing them -- has nothing to type the import against without this.
// A sibling `.d.mts` is what TypeScript resolves for a relative `.mjs`
// specifier; an ambient `declare module` cannot name a relative path.

/** Absolute path of the generated example config for one preset name. */
export function examplePath(name: string): string;

/** Renders one preset's example config from the built `lib/` output. */
export function renderExample(name: string): Promise<string>;
