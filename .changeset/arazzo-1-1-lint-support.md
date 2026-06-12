---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added support for validating Arazzo 1.1.0 descriptions in the `lint` command, including `$self`, AsyncAPI source descriptions, Step Object `channelPath`/`action`/`correlationId`/`timeout`/`dependsOn` fields, `querystring` parameters, Selector Objects in outputs and payload replacements, Expression Type Objects (including `rfc9535` and `xpath-31` versions), and `parameters` on Success/Failure Action Objects. Arazzo 1.0.x documents continue to be validated against the 1.0.1 specification.
