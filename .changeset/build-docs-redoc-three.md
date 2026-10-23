---
'@redocly/cli': minor
---

**Breaking**: Updated the `build-docs` command to Redoc 3 and added support for AsyncAPI descriptions and GraphQL schemas.
Added the `--openapi`, `--asyncapi`, `--graphql`, and `--inlineBundle` options.
Removed `--theme.openapi` and `--disableGoogleFont`, pass Redoc options with `--openapi` instead.
Some Redoc 2 options were renamed or removed, see the [`build-docs` documentation](https://redocly.com/docs/cli/commands/build-docs).
The command now applies the [decorators](https://redocly.com/docs/cli/decorators) and [preprocessors](https://redocly.com/docs/cli/configuration/reference/preprocessors) from the configuration file.
Pages built with the `build-docs` command now send [Redoc telemetry](https://redocly.com/docs/redoc/telemetry) from readers' browsers by default.
