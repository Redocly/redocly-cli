# Rules

## Overview

All supported rules are listed below. To change your settings for any given rule, just add or modify a corresponding item in the `rules` section of the `.redocly.yaml` in your working directory.

Each of the `rules` entries can be one of following:
- `rule-name`: `{severity}`, where `{severity}` is on of `error`, `warning` or `off`
- ```
  rule-name:
    severity: {severity}
    options:
      rule-option-one: value
  ```

## Existing rules

### boolean-parameter-prefixes
`name` fields of Parameters with type `boolean` should have a `is` or `has` prefix

### example-value-or-external-value
Examples for `requestBody` or response examples can have an `externalValue` or a `value`, but they cannot have both.

###  oas3-server-not-example.com
Server URL should not point at example.com.

###  oas3-server-trailing-slash
Server URL should not have a trailing slash.

Some tooling forgets to strip trailing slashes off when it's joining the servers.url with paths, and you can get awkward URLs like `https://example.com/api//pets`. Best to just strip them off yourself.

###  openapi-tags-alphabetical
OpenAPI object should have alphabetical `tags`. This will be sorted by the `name` property.

### operation-2xx-response
Operation must have at least one `2xx` response. Any API operation (endpoint) can fail but presumably it is also meant to do something constructive at some point. If you forget to write out a success case for this API, then this rule will let you know.

### operation-operationId-unique
Every operation must have a unique `operationId`.

Why? A lot of documentation systems use this as an identifier, some SDK generators convert them to a method name, all sorts of things like that.

### operation-operationId-valid-in-url
Seeing as `operationId` is often used for unique URLs in documentation systems, it's a good idea to avoid non-URL safe characters.

### no-undefined-or-empty-string
This rule validates that optional (by the OAS definition) fields are defined and non-empty.

For scalar values it checks that such property exists and is not empty string.

For objects this rule only checks that such child exists.

In the default config it checks following items:
- Info.description
- Info.license
- Info.contact
- Tag.description

### operation-security-defined
Operation `security` values must match a scheme defined in the `components.securitySchemes` object.

### operation-singular-tag
Use just one tag for an operation, which is helpful for some documentation systems which use tags to avoid duplicate content.

### operation-tag-defined
Operation tags should be defined in global tags.

### path-declaration-must-exist
Path parameter declarations cannot be empty, ex. `/given/{}`is invalid.

### path-keys-no-trailing-slash
Keep trailing slashes off of paths, as it can cause some confusion. Some web tooling (like mock servers, real servers, code generators, application frameworks, etc.) will treat `example.com/foo` and `example.com/foo/` as the same thing, but other tooling will not. Avoid any confusion by just documenting them without the slash, and maybe some tooling will let people shove a / on there when they're using it or maybe not, but at least the docs are suggesting how it should be done properly.

### path-not-include-query
Don't put query string items in the path, they belong in parameters with `in: query`.

### typed-enum
Enum values should respect the type specifier.

### paths-kebab-case
All path items should be in kebab-case.

### schema
Validate structure of OpenAPI v3 specification.

## Recommended config

Recommended configuration can be enabled by adding
```
  extends:
    - recommended
```
section to the `lint` group in the `.redocly.yaml`.

The recommended preset will enbale rules with following levels:

- **Error**
  - operation-2xx-response
  - operation-operationId-unique
  - operation-parameters-unique
  - path-parameters-defined
  - example-value-or-external-value
  - typed-enum
  - path-declaration-must-exist
  - path-not-include-query
  - operation-security-defined
  - no-unresolved-refs
- **Warning**
  - path-no-trailing-slashes
  - operationId-valid-in-url
  - server-not-example.com
  - server-trailing-slash
  - info-description
  - tag-description
  - no-unused-schemas
  - operation-singular-tag
  - boolean-parameter-prefixes
- **Off**
  - operation-tag-defined
  - openapi-tags-alphabetical

Later you can extend this preset by editing or adding `rules` object to the `lint` configuration as shown in the beginning of the page.