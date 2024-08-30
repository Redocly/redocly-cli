---
slug: /docs/cli/rules/recommended
---

# Recommended ruleset

These are the rules in the `recommended` set, grouped by their severity.

Errors:

- [no-empty-servers](./no-empty-servers.md)
- [no-enum-type-mismatch](./no-enum-type-mismatch.md)
- [no-example-value-and-externalValue](./no-example-value-and-externalValue.md)
- [no-identical-paths](./no-identical-paths.md)
- [no-path-trailing-slash](./no-path-trailing-slash.md)
- [no-server-trailing-slash](./no-server-trailing-slash.md)
- [no-server-variables-empty-enum](./no-server-variables-empty-enum.md)
- [no-undefined-server-variable](./no-undefined-server-variable.md)
- [no-unresolved-refs](./no-unresolved-refs.md)
- [operation-operationId-unique](./operation-operationId-unique.md)
- [operation-operationId-url-safe](./operation-operationId-url-safe.md)
- [operation-parameters-unique](./operation-parameters-unique.md)
- [operation-summary](./operation-summary.md)
- [path-declaration-must-exist](./path-declaration-must-exist.md)
- [path-not-include-query](./path-not-include-query.md)
- [path-parameters-defined](./path-parameters-defined.md)
- [security-defined](./security-defined.md)
- [spec-components-invalid-map-name](./spec-components-invalid-map-name.md)
- [spec](./spec.md)
- [parameters-unique](./arazzo/parameters-unique.md)
- [sourceDescription-type](./arazzo/sourceDescriptions-type.md)
- [sourceDescription-name-unique](./arazzo/sourceDescriptions-name-unique.md)
- [stepId-unique](./arazzo/stepId-unique.md)
- [workflow-dependsOn](./arazzo/workflow-dependsOn.md)
- [workflowId-unique](./arazzo/workflowId-unique.md)

Warnings:

- [configurable rules](./configurable-rules.md)
- [info-license-url](./info-license-url.md)
- [info-license](./info-license.md)
- [no-ambiguous-paths](./no-ambiguous-paths.md)
- [no-invalid-media-type-examples](./no-invalid-media-type-examples.md)
- [no-server-example.com](./no-server-example-com.md)
- [no-unused-components](./no-unused-components.md)
- [operation-2xx-response](./operation-2xx-response.md)
- [operation-4xx-response](./operation-4xx-response.md)
- [operation-operationId](./operation-operationId.md)
- [tag-description](./tag-description.md)
- [version-enum](./spot/version-enum.md)
- [parameters-not-in-body](./spot/parameters-not-in-body.md)
- [requestBody-replacements-unique](./arazzo/requestBody-replacements-unique.md)
- [step-onFailure-unique](./arazzo/step-onFailure-unique.md)
- [step-onSuccess-unique](./arazzo/step-onSuccess-unique.md)

## Recommended strict ruleset

There is also a `recommended-strict` version of `recommended`, which elevates all warnings to errors.
