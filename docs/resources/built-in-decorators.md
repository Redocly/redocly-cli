---
title: Built-in decorators in OpenAPI CLI
---

# Built-in decorators

Decorators are used to modify content in API definitions during the bundle process, after the validation is complete. Redocly supports several built-in decorators that you can use with OpenAPI CLI.

To use any of the decorators listed on this page, configure them in the `lint.decorators` section of the `.redocly.yaml` file in your working directory.

The following example shows how to configure a decorator in the `.redocly.yaml` file.

```yaml
apiDefinitions:
  example: ./openapi/openapi.yaml
lint:
  decorators:
    decorator-name:
      decorator-option: example-value
```

Optionally, you may specify `severity` as one of decorator options in the configuration. Severity can be set to `error`, `warn` or `off`, similar to how it works with [rules](built-in-rules.md). When it's specified, any problem reported from the decorator is treated according to the configured severity. Setting `severity: off` disables the decorator altogether. Generally, it's not necessary to specify `severity` for decorator configuration except for troubleshooting purposes.


## List of built-in decorators

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

### filter-for-permission

Remove all nodes that have a specific `permissionProperty` property (`x-internal` by default) and `permissionValue` (`true` by default).

Remove additional remnants from components by also using the `--remove-unused-components` CLI argument.

You may use env variables to define properties:
```
    permissionProperty: process.env.FILTER_BY_PERMISSION_PROPERTY
    permissionValue: process.env.FILTER_BY_PERMISSION_VALUE
```

```yaml
lint:
  decorators:
    filter-for-permission:
      permissionProperty: 'x-permission'
      permissionValue: 'guest'
```

Property can be defined as a `string` or `array of strings` inside of any node in the definition:

```
sample:
  type: string
  x-permission:
    - guest
    - customer
    - admin
```
