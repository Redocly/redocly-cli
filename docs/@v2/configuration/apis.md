# Per-API configuration

Use the `apis` object to configure one or more APIs separately from the main configuration.
Every API in the object is identified by its unique name.

For every API listed in the object, you must provide the path to the OpenAPI description using the `root` property.

If `rules`, `decorators`, or `preprocessors` aren't defined for an API, root settings are used.
If `rules`, `decorators`, or `preprocessors` are defined for an API, they apply together with the root configuration.
If the same `rules`, `decorators`, or `preprocessors` are defined on `apis` and the root level, per-API `rules`, `decorators`, and `preprocessors` override the root ones.

For example, if you include the same `decorator` at the root level and for a specific API, but with different properties, the API-level settings replace the root ones.

So if you have the following `redocly.yaml` configuration, adding `filter-in` and `plugin/change-title` at the root level and applying `plugin/change-title` with a different `title` property to the `storefront` API:

```yaml
decorators:
  filter-in:
    property: x-products
    value:
      - Core
  plugin/change-title:
    title: All APIs
    extraProperty: This property will be ignored at the per-API level.


apis:
  storefront:
    decorators:
      plugin/change-title:
        title: Storefront APIs
```

The `plugin/change-title` decorator with the "Storefront APIs" `title` property is applied to the `storefront` API with the value `Storefront APIs`, and the `filter-in` decorator is also applied to the `storefront` API.

For all other APIs, not including the `storefront` API, `filter-in` and `plugin/change-title` with the "Core" `title` and `extraProperty` properties are applied.

## Patterned properties

{% json-schema
  schema={
    "$ref": "./api.yaml"
  }
/%}

## Example

```yaml
apis:
  name:
    root: ./openapi/openapi.yaml
    openapi: {}
    output: ./openapi/bundled.yaml
```

{% admonition type="warning" name="Important" %}
Per-API configurations take priority over global settings.
{% /admonition %}
