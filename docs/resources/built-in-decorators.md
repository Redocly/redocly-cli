---
title: Built-in decorators in Redocly CLI
---

# Built-in decorators

Decorators are used to modify content in API definitions during the bundle process, after the validation is complete. Redocly supports several built-in decorators that you can use with Redocly CLI.

To use any of the decorators listed on this page, configure them in the `lint.decorators` section of the Redocly configuration file in your working directory.

You can specify global settings in the top-level `lint.decorators` section, or use per-API settings by adding a `lint.decorators` section under each API in `apis`.

The following example shows how to configure a decorator in the Redocly configuration file.

```yaml
apis:
  main:
    root: ./openapi/openapi.yaml
    lint:
      decorators:
        decorator-name:
          decorator-option: example-value
lint:
  decorators:
    decorator-name:
      decorator-option: example-value
```

Optionally, you may specify `severity` as one of decorator options in the configuration. Severity can be set to `error`, `warn` or `off`, similar to how it works with [rules](built-in-rules.md). When it's specified, any problem reported from the decorator is treated according to the configured severity. Setting `severity: off` disables the decorator altogether. Generally, it's not necessary to specify `severity` for decorator configuration except for troubleshooting purposes.


## List of built-in decorators

### filter-in

Preserves nodes that have specific `property` set to the specific `value` and removes others. Nodes that don't have the `property` defined are not impacted.

This decorator supports array values. To adjust arrays comparison, you can use `matchStrategy` that can take the values `all` and `any` (`any` by default).

```yaml
lint:
  decorators:
    filter-in:
      property: x-audience
      value: [Public, Partner]
      matchStrategy: any
```

### filter-out

Remove nodes that have specific `property` set to the specific `value`. Nodes that don't have the `property` defined are not impacted.

This decorator supports array values. To adjust arrays comparison, you can use `matchStrategy` that can take the values `all` and `any` (`any` by default).

```yaml
lint:
  decorators:
    filter-out:
      property: x-audience
      value: Internal
      matchStrategy: any
```

### info-description-override

Replaces any existing content in the `info.description` field with custom content from the specified Markdown file.

```yaml
lint:
  decorators:
    info-description-override:
      filePath: ./my-custom-description.md
```


### operation-description-override

Replaces any existing content in the `operation.description` field for the specified operation ID with custom content from the Markdown file.

The `operationIds` option accepts one or more operation IDs mapped to Markdown files (in the format `operation ID: path to Markdown file`).


```yaml
lint:
  decorators:
    operation-description-override:
      operationIds:
        updatePet: ./my-custom-description.md
```

### remove-x-internal

Remove all nodes that have a specific `internalFlagProperty` property (`x-internal` by default).

Remove additional remnants from components by also using the `--remove-unused-components` CLI argument.

```yaml
lint:
  decorators:
    remove-x-internal:
      internalFlagProperty: 'removeit'
```


### tag-description-override

Replaces any existing content in the `tags.description` field for the specified tag name with custom content from the Markdown file.

The `tagNames` option accepts one or more tag names mapped to Markdown files (in the format `tag name: path to Markdown file`).

```yaml
lint:
  decorators:
    tag-description-override:
      tagNames:
        pet: ./my-custom-description.md
```

