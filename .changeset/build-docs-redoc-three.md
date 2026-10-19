---
'@redocly/cli': minor
---

Updated the `build-docs` command to Redoc 3 and added support for AsyncAPI descriptions and GraphQL schemas.
Added the `--openapi`, `--asyncapi`, `--graphql`, and `--inlineBundle` options.

**Note**: `--theme.openapi` is no longer accepted, pass Redoc options with `--openapi` instead.
Redoc 3 also renamed or removed some Redoc 2 configuration options, so existing settings may need updating.
