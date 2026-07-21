# Azure APIM support

Authors:

- [`adamaltman`](https://github.com/adamaltman) Adam Altman (Redocly)

## What this does and why

This catches OpenAPI usage unsupported or ignored by [Azure API Management](https://learn.microsoft.com/en-us/azure/api-management/api-management-api-import-restrictions):

- `operationId` must be kebab-case and 76 characters max length.
- Operation `summary` must be 300 characters max length.
- Security is ignored.
- Only one server is used.
- `$ref` must be used for schemas and must only point to in-file components schemas (no external files or URLs).
- A [table full of unsupported properties](https://learn.microsoft.com/en-us/azure/api-management/api-management-api-import-restrictions#unsupported) are flagged as errors.

Note that a lot of the usage contradicts best practices. As such, it might be more prudent to use a decorator to transform a richer OpenAPI description into one that is supported by Azure APIM as a step in a pipeline.

This ruleset can help validate the output of the decorator is viable for Azure APIM.

Azure APIM isn't prescriptive if unsupported features break the import/add/update process or if they are silently ignored.
Users have a reported a combination of those behaviors.

## Code

The first rule checks that the `operationId` conforms to the Azure APIM expectations of kebab-case and 76 max characters.
It is set to be a warning level severity because Azure APIM automatically transforms non-compliant `operationId` values.

```yaml
rules:
  rule/operation-pattern-azure-apim:
    subject:
      type: Operation
      property: operationId
    assertions:
      casing: kebab-case
      maxLength: 76
    severity: warn
```

The second rule checks that the operation `summary` is 300 characters max length.

```yaml
rule/summary-length-azure-apim:
  subject:
    type: Operation
    property: summary
  assertions:
    maxLength: 300
  severity: warn
```

The next rules highlights if there would be any servers that are ignored (and if you have any that don't use HTTPS):

```yaml
rule/multiple-servers-ignored-azure-apim:
  subject:
    type: ServerList
  assertions:
    maxLength: 1
  message: If multiple servers are specified, API Management will use the first HTTPS URL it finds.
  severity: warn

rule/servers-not-https-azure-apim:
  subject:
    type: Server
    property: url
  assertions:
    pattern: '^https:\/\/.*'
  message: Server URL must start with HTTPS.
```

The next rule checks that schema is not defined inline (uses a `$ref` for MediaType `schema`).
It also checks that the reference object link is to the components section of the same file which means it starts with `#/components`.

```yaml
rule/mediatype-schema-ref-pattern-azure-apim:
  subject:
    type: MediaType
    property: schema
  message: Inline schema definitions and refs that point to URLs or files aren't supported.
  assertions:
    ref: /^#\/components\/.*/
```

The next two rules ensure external docs and info summary aren't used.

```yaml
rule/external-docs-unsupported-azure-apim:
  subject:
    type: ExternalDocs
  assertions:
    defined: false
  message: Azure APIM does not support externalDocs.

rule/info-summary-unsupported-azure-apim:
  subject:
    type: Info
    property: summary
  assertions:
    defined: false
  message: Azure APIM does not support Info summary.
```

APIM ignores security. This rule let's you know if it is left in there:

```yaml
rule/security-ignored-azure-apim:
  subject:
    type: SecurityRequirementList
  assertions:
    defined: false
  message: Azure APIM ignores security.
```

APIM documentation has a table of unsupported OpenAPI keywords. The following set of rules makes sure those features aren't used.

```yaml
rule/components-unsupported-azure-apim:
  subject:
    type: Components
  assertions:
    disallowed:
      - responses
      - parameters
      - examples
      - requestBodies
      - headers
      - securitySchemes
      - links
      - callbacks
  message: Azure APIM does not support components other than schemas.

rule/trace-unsupported-azure-apim:
  subject:
    type: PathItem
  assertions:
    disallowed:
      - trace
  message: Azure APIM does not support trace operations.

rule/path-item-servers-unsupported-azure-apim:
  subject:
    type: PathItem
  assertions:
    disallowed:
      - servers
  message: Azure APIM does not support servers defined on path items.

rule/operation-properties-unsupported-azure-apim:
  subject:
    type: Operation
  assertions:
    disallowed:
      - externalDocs
      - callbacks
      - servers
      - security

rule/parameter-properties-unsupported-azure-apim:
  subject:
    type: Parameter
  assertions:
    disallowed:
      - allowEmptyValue
      - style
      - explode
      - allowReserved
```

## Examples

The following snippets show how the configurable rules catch the likely bad uses of keywords.

### Unsupported externalDocs

```yaml
openapi: 3.1.0
externalDocs: https://example.com
# ...
```

Remove `externalDocs` to avoid any issues.

**Allowed transformation**

```yaml
openapi: 3.1.0
# ...
```

The [example OpenAPI description](./openapi.yaml), a small cafe API, has a variety of unsupported features in use.

## References

- https://learn.microsoft.com/en-us/azure/api-management/api-management-api-import-restrictions
