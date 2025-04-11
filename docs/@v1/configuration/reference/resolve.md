# `resolve`

## Introduction

The `resolve` configuration provides options for how URLs in API descriptions are handled.
If a URL is not publicly accessible, use these configuration settings to add the needed details to gain access.

{% admonition type="info" %}
One HTTP header is supported for each URL resolved.
{% /admonition %}

## Options

{% table %}

- Option
- Type
- Description

---

- doNotResolveExamples
- boolean
- When running `lint`, set this option to `true` to avoid resolving `$ref` fields in examples. Resolving `$ref`s in other parts of the API is unaffected.

---

- http
- [HTTP object](#http-object)
- Describe URL patterns and the corresponding headers to use when resolving references that point to them.

{% /table %}

### HTTP object

{% table %}

- Option
- Type
- Description

---

- matches
- string
- **REQUIRED**. The URL pattern to match, for example `https://api.example.com/v2/**` or `https://example.com/*/test.yaml`.

---

- name
- string
- **REQUIRED**. The header name, for example `Authorization`.

---

- value
- string
- The value to send for the header. Only one of `value` or `envVariable` can be used; `envVariable` is recommended for any secrets.

---

- envVariable
- string
- The name of the environment variable that contains the value to send for the header. Only one of `value` or `envVariable` can be used; `envVariable` is recommended for any secrets.

{% /table %}

## Examples

If you have multiple examples to resolve, you can describe multiple entries with patterns to match and headers to include.
The following example shows two patterns, with the names of environment variables that contain the values to use.

```text
resolve:
  http:
    headers:
      - matches: https://api.example.com/v2/**
        name: X-API-KEY
        envVariable: SECRET_KEY
      - matches: https://example.com/*/test.yaml
        name: Authorization
        envVariable: SECRET_AUTH
```

When the OpenAPI description references a URL that matches these patterns, it is resolved using the additional header specified.

## Resources

- [Configuration for Redocly CLI](../index.md).
- [How to use `$ref` in OpenAPI](https://redocly.com/docs/resources/ref-guide/).
