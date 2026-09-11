// `nspell` ships no type declarations and has no `@types/nspell` package.
// It's reached only via dynamic `import()` in rules/scope/spelling.ts; this
// ambient declaration exists solely to satisfy the type checker at that
// `import()` site -- the shapes actually used are spelling.ts's local
// structural types.
declare module 'nspell';
