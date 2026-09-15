// `nspell` ships no type declarations and has no `@types/nspell` package.
// It's an optional peer dependency reached only via dynamic `import()`
// (rules/scope/spelling.ts, config/validate.ts); this ambient declaration
// exists solely to satisfy the type checker at those `import()` sites --
// the shapes actually used are spelling.ts's local structural types.
declare module 'nspell';
