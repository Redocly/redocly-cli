# x-security-scheme-name-reference

When multiple `sourceDescriptions` exist, `workflow.x-security.schemeName` must be a reference to a specific source description (for example, `$sourceDescriptions.{name}.{schemeName}`). If there is only one source description, a plain string is allowed.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

With multiple source descriptions, using a plain `schemeName` is ambiguous. Requiring a reference of the form `$sourceDescriptions.{name}.{schemeName}` disambiguates which source description provides the security scheme.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  x-security-scheme-name-reference: error
```

## Examples

Given the following configuration:

```yaml
rules:
  x-security-scheme-name-reference: error
```

Example with multiple source descriptions — incorrect (plain string `schemeName`):

```yaml
sourceDescriptions:
  - name: museum-api
    type: openapi
    url: ./museum.yaml
  - name: pets-api
    type: openapi
    url: ./pets.yaml

workflows:
  - workflowId: list-users
    x-security:
      - schemeName: BasicAuth   # <- must be a reference when multiple sources exist
        values:
          username: test@example.com
          password: 123456
```

Example with multiple source descriptions — correct (referenced `schemeName`):

```yaml
sourceDescriptions:
  - name: museum-api
    type: openapi
    url: ./museum.yaml
  - name: pets-api
    type: openapi
    url: ./pets.yaml

workflows:
  - workflowId: list-users
    x-security:
      - schemeName: $sourceDescriptions.museum-api.MuseumPlaceholderAuth
        values:
          username: test@example.com
          password: 123456
```

Example with a single source description — allowed (plain string `schemeName`):

```yaml
sourceDescriptions:
  - name: museum-api
    type: openapi
    url: ./museum.yaml

workflows:
  - workflowId: list-users
    x-security:
      - schemeName: BasicAuth
        values:
          username: test@example.com
          password: 123456
```

## Related rules

- [no-x-security-both-scheme-and-scheme-name](./no-x-security-both-scheme-and-scheme-name.md)
- [x-security-scheme-required-values](./x-security-scheme-required-values.md)

## Resources

- Rule source: https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/respect/x-security-scheme-name-reference.ts
