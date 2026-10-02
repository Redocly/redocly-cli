---
'@redocly/cli': minor
---

Added support for `in: querystring` parameters to the experimental `drift` command.
The whole query string is validated against the schema of the parameter's `content` media type, a missing required querystring is reported, and the parameter is counted in `--coverage`.
Previously such parameters were ignored and every query key in the traffic was reported as undocumented.

Fixed the `schema-consistency` rule of the `drift` command so that a `readOnly` property listed in a parameter schema's `required` is no longer demanded from the request.
