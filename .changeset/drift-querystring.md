---
'@redocly/cli': minor
---

Added support for `in: querystring` parameters to the experimental `drift` command.
The command validates the whole query string against the parameter's schema, instead of reporting every query key as undocumented.

Fixed the `schema-consistency` rule of the `drift` command so that a `readOnly` property listed in a parameter schema's `required` is no longer demanded from the request.
