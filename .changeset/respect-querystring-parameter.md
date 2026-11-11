---
'@redocly/respect-core': minor
'@redocly/cli': minor
---

Added support for the `querystring` parameter location of Arazzo 1.1.0 and OpenAPI 3.2 to the `respect` command.
A step or workflow parameter with `in: querystring` sets the whole query string of the request.
A step without `parameters` takes a required `querystring` parameter from the OpenAPI description, the same way as the other parameters.
