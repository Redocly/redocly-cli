---
'@redocly/cli': minor
---

Updated the `build-docs` command to Redoc 3 and added support for AsyncAPI descriptions and GraphQL schemas.
Added the `--openapi`, `--asyncapi`, `--graphql`, and `--inlineBundle` options.

**Breaking**: `build-docs` now renders Redoc 3 instead of Redoc 2.
`--theme.openapi` and `--disableGoogleFont` are removed, pass Redoc options with `--openapi` instead.
Some Redoc 2 options were renamed or removed, see the [`build-docs` documentation](https://redocly.com/docs/cli/commands/build-docs).
