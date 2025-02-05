# Per-API configuration

The `apis` object is used to configure one or more APIs.
Every API in the object is identified by its name and version in the format `name@version`.
The version is optional, and when not provided, Redocly apps interpret it as `latest` by default.
Every `name@version` combination listed in the object must be unique.

For every API listed in the object, you must provide the path to the OpenAPI description using the `root` property.

If `rules`, `decorators`, or `preprocessors` aren't defined for an API, root settings are used.
If `rules`, `decorators`, or `preprocessors` are defined for an API, they apply together with the root configuration.
If per-API `rules`, `decorators`, or `preprocessors` and root settings modify the same properties, per-API `rules`, `decorators`, and `preprocessors` override root settings.

For example, if you include the same `decorator` at the root level and for a specific API, but with different properties, only the properties applied to the specific API will be applied to that API.

So if you have the following `redocly.yaml` configuration, adding `decorator-one` and `decorator-two` at the root level and applying `decorator-one` to the `override@v1` API:

```yaml
decorators:
  decorator-one:
    property-one: 1
    property-two: 2
  decorator-two:
    property-three: 3
    property-four: 4

apis:
  override@v1:
    decorators:
      decorator-one:
        property-five: 5
```

Only `property-five` is applied to `decorator-one` for the `override@v2` API, and both `property-three` and `property-four` are applied for `decorator-two`.

For all other APIs, not including the `override@v2` API, `property-one` and `property-two` are applied to `decorator-one` and `property-three` and `property-four` are applied to `decorator-two`.


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
