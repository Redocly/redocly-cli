---
'@redocly/cli': minor
---

Added support for `in: querystring` parameters to the experimental `drift` command.
The command validates the whole query string against the parameter's schema, instead of reporting every query key as undocumented.
In `--coverage`, each key of a form-urlencoded querystring schema counts as a separate parameter.
