---
slug: /docs/cli/rules/recommended
---

# Recommended ruleset

These are the rules in the `recommended` set, grouped by their severity.

Errors:

- [no-empty-servers](./oas/no-empty-servers.md)
- [no-enum-type-mismatch](./oas/no-enum-type-mismatch.md)
- [no-example-value-and-externalValue](./oas/no-example-value-and-externalValue.md)
- [no-identical-paths](./oas/no-identical-paths.md)
- [no-path-trailing-slash](./oas/no-path-trailing-slash.md)
- [no-server-trailing-slash](./oas/no-server-trailing-slash.md)
- [no-server-variables-empty-enum](./oas/no-server-variables-empty-enum.md)
- [no-undefined-server-variable](./oas/no-undefined-server-variable.md)
- [no-unresolved-refs](./oas/no-unresolved-refs.md)
- [operation-operationId-unique](./oas/operation-operationId-unique.md)
- [operation-operationId-url-safe](./oas/operation-operationId-url-safe.md)
- [operation-parameters-unique](./oas/operation-parameters-unique.md)
- [operation-summary](./oas/operation-summary.md)
- [path-declaration-must-exist](./oas/path-declaration-must-exist.md)
- [path-not-include-query](./oas/path-not-include-query.md)
- [path-parameters-defined](./oas/path-parameters-defined.md)
- [security-defined](./oas/security-defined.md)
- [spec-components-invalid-map-name](./oas/spec-components-invalid-map-name.md)
- [struct](./oas/struct.md)

Warnings:

- [configurable rules](./configurable-rules.md)
- [info-license-url](./oas/info-license-url.md)
- [info-license](./oas/info-license.md)
- [no-ambiguous-paths](./oas/no-ambiguous-paths.md)
- [no-invalid-media-type-examples](./oas/no-invalid-media-type-examples.md)
- [no-server-example.com](./oas/no-server-example-com.md)
- [no-unused-components](./oas/no-unused-components.md)
- [operation-2xx-response](./oas/operation-2xx-response.md)
- [operation-4xx-response](./oas/operation-4xx-response.md)
- [operation-operationId](./oas/operation-operationId.md)
- [tag-description](./oas/tag-description.md)

## Recommended strict ruleset

There is also a `recommended-strict` version of `recommended`, which elevates all warnings to errors.
