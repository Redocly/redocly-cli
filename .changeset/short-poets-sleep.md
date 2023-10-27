---
'@redocly/openapi-core': patch
---

OpenAPI 3.1.x defaults to JSON Schema draft 2020-12 and the value of property names defined in `properties` was updated since OpenAPI 3.0.x and JSON Schema draft-04.

In the new JSON Schema specification, each property value within a `properties` schema accepts a `boolean` or `object` schema.

https://json-schema.org/draft/2020-12/json-schema-core#section-10.3.2.1
