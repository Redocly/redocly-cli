---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed plugin loading breaking in consumers that bundle `@redocly/openapi-core` with webpack or rspack. TypeScript's `rewriteRelativeImportExtensions` wrapped the dynamic `import()` in `loadPluginModule` in a helper call, hiding the `webpackIgnore` magic comment from bundlers and causing them to rewrite the import into a broken require.
