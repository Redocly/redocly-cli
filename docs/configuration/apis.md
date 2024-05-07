# Per-API configuration

The `apis` object is used to configure one or more APIs.
Every API in the object is identified by its name and version in the format `name@version`.
The version is optional, and when not provided, Redocly apps interpret it as `latest` by default.
Every `name@version` combination listed in the object must be unique.

For every API listed in the object, you must provide the path to the OpenAPI description using the `root` property.

If `rules`, `decorators`, or `preprocessors` aren't defined for an API, root settings are used.
If `rules`, `decorators`, or `preprocessors` are defined for an API, its settings apply together with the root configuration.
If per-API and root settings modify the same properties, per-API settings overrides root settings.

## Patterned properties

{% json-schema
  schema="./api.yaml"
   options={
    schemaExpansionLevel: 2,
  }
/%}

## Example

```yaml
apis:
  name@version:
    root: ./openapi/openapi.yaml
    labels:
      - production
    theme:
      openapi: {}
```

{% admonition type="warning" name="Important" %}
Per-API configurations take priority over global settings.
{% /admonition %}
