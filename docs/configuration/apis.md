# Per-API configuration

The `apis` object is used to configure one or more APIs.
Every API in the object is identified by its name and version in the format `name@version`.
The version is optional, and when not provided, Redocly apps interpret it as `latest` by default.
Every `name@version` combination listed in the object must be unique.

For every API listed in the object, you must provide the path to the OpenAPI description using the `root` property.

If `rules`, `decorators`, or `preprocessors` aren't defined for an API, root settings are used.
If `rules`, `decorators`, or `preprocessors` are defined for an API, they apply together with the root configuration.
If per-API `rules`, `decorators`, or `preprocessors` and root settings modify the same properties, per-API `rules`, `decorators`, and `preprocessors` override root settings.

For example, if you include the same `decorator` at the root level and for a specific API, but with different properties, the API-level settings replace the root ones.

So if you have the following `redocly.yaml` configuration, adding `filter-in` and `plugin/change-title` at the root level and applying `plugin/change-title` with a different `title` property to the `storefront@latest` API:

```yaml
decorators:
  filter-in:
    property: x-products
    value:
      - Core
  plugin/change-title:
    title: All APIs
  

apis:
  storefront@latest:
    decorators:
      plugin/change-title:
        title: Storefront APIs
```

The `plugin/change-title` decorator with the "Storefront APIs" `title` property is applied to the `storefront@latest` API, and the `filter-in` decorator is also applied to the `storefront@latest` API.

For all other APIs, not including the `storefront@latest` API, `filter-in` and `plugin/change-title` with the "Core" `title` property are applied.


## Patterned properties

{% json-schema
  schema={
    "$ref": "./api.yaml"
  }
/%}

## Example

```yaml
apis:
  name@version:
    root: ./openapi/openapi.yaml
    labels:
      - production
    openapi: {}
    output: ./openapi/bundled.yaml
```

{% admonition type="warning" name="Important" %}
Per-API configurations take priority over global settings.
{% /admonition %}
