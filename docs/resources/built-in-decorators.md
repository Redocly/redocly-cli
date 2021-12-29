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

### hide-internals

Using `x-internal` tag by default to hide nodes:
```
  PathItem
  Operation
  Schema
  Response
  RequestBody
  Example
  MediaType
  Server
  Callback
  Parameter
```

The `tagToHide` option uses to define name of tag.

```yaml
lint:
  decorators:
    hide-internals:
      tagToHide: 'hideit'
```

### clear-unused-components

Remove unused components. A good point to use with `hide-internals` decorator.
