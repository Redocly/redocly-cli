---
slug: /docs/cli/rules/recommended
---

# Recommended ruleset

These are the rules in the `recommended` set, grouped by their severity.

Errors:

- [no-empty-servers](./oas/no-empty-servers.md)
- [no-enum-type-mismatch](./common/no-enum-type-mismatch.md)
- [no-example-value-and-externalValue](./oas/no-example-value-and-externalValue.md)
- [no-identical-paths](./oas/no-identical-paths.md)
- [no-path-trailing-slash](./oas/no-path-trailing-slash.md)
- [no-schema-type-mismatch](./common/no-schema-type-mismatch.md)
- [no-server-trailing-slash](./oas/no-server-trailing-slash.md)
- [no-server-variables-empty-enum](./oas/no-server-variables-empty-enum.md)
- [no-undefined-server-variable](./oas/no-undefined-server-variable.md)
- [no-unresolved-refs](./common/no-unresolved-refs.md)
- [nullable-type-sibling](./oas/nullable-type-sibling.md)
- [operation-operationId-unique](./oas/operation-operationId-unique.md)
- [operation-operationId-url-safe](./oas/operation-operationId-url-safe.md)
- [operation-parameters-unique](./oas/operation-parameters-unique.md)
- [operation-summary](./oas/operation-summary.md)
- [parameters-unique](./arazzo/parameters-unique.md)
- [path-declaration-must-exist](./oas/path-declaration-must-exist.md)
- [path-not-include-query](./oas/path-not-include-query.md)
- [path-parameters-defined](./oas/path-parameters-defined.md)
- [security-defined](./oas/security-defined.md)
- [sourceDescription-name-unique](./arazzo/sourceDescriptions-name-unique.md)
- [sourceDescription-type](./arazzo/sourceDescriptions-type.md)
- [sourceDescriptions-not-empty](./arazzo/sourceDescriptions-not-empty.md)
- [spec-components-invalid-map-name](./oas/spec-components-invalid-map-name.md)
- [spec-example-values](./oas/spec-example-values.md)
- [spec-no-invalid-encoding-combinations](./oas/spec-no-invalid-encoding-combinations.md)
- [spec-no-invalid-tag-parents](./oas/spec-no-invalid-tag-parents.md)
- [stepId-unique](./arazzo/stepId-unique.md)
- [struct](./common/struct.md)
- [workflow-dependsOn](./arazzo/workflow-dependsOn.md)
- [workflowId-unique](./arazzo/workflowId-unique.md)

Warnings:

- [configurable rules](./configurable-rules.md)
- [criteria-unique](./arazzo/criteria-unique.md)
- [info-license](./oas/info-license.md)
- [info-license-strict](./oas/info-license-strict.md)
- [no-ambiguous-paths](./oas/no-ambiguous-paths.md)
- [no-duplicated-tag-names](./oas/no-duplicated-tag-names.md)
- [no-invalid-media-type-examples](./oas/no-invalid-media-type-examples.md)
- [no-invalid-parameter-examples](./oas/no-invalid-parameter-examples.md)
- [no-invalid-schema-examples](./oas/no-invalid-schema-examples.md)
- [no-required-schema-properties-undefined](./common/no-required-schema-properties-undefined.md)
- [no-server-example.com](./oas/no-server-example-com.md)
- [no-unused-components](./oas/no-unused-components.md)
- [operation-2xx-response](./oas/operation-2xx-response.md)
- [operation-4xx-response](./oas/operation-4xx-response.md)
- [operation-operationId](./oas/operation-operationId.md)
- [requestBody-replacements-unique](./arazzo/requestBody-replacements-unique.md)
- [spec-discriminator-defaultMapping](./oas/spec-discriminator-defaultMapping.md)
- [step-onFailure-unique](./arazzo/step-onFailure-unique.md)
- [step-onSuccess-unique](./arazzo/step-onSuccess-unique.md)
- [tag-description](./oas/tag-description.md)

## Recommended strict ruleset

There is also a `recommended-strict` version of `recommended`, which elevates all warnings to errors.

## Ruleset template

A copy-pastable version of this ruleset is available as a [ruleset template](./ruleset-templates.md).
