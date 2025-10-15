# x-security-scheme-name-link

When multiple `sourceDescriptions` exist, `workflow.x-security.schemeName` must be a link to a specific source description (for example, `$sourceDescriptions.{name}.scheme`).
If there is only one source description, a plain string is allowed.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

With multiple source descriptions, using a plain `schemeName` is ambiguous.
Requiring a link of the form `$sourceDescriptions.{name}.scheme` disambiguates which source description provides the security scheme.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

An example configuration:

```yaml
rules:
  x-security-scheme-name-link: error
```

## Examples

Given the following configuration:

```yaml
rules:
  x-security-scheme-name-link: error
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
      - schemeName: BasicAuth   # <- must be a link when multiple sources exist
        values:
          username: test@example.com
          password: 123456
```

Example with multiple source descriptions — correct (linked `schemeName`):

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
      - schemeName: $sourceDescriptions.museum-api.scheme
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

- [sourceDescriptions-not-empty](./sourceDescriptions-not-empty.md)
- [sourceDescriptions-name-unique](./sourceDescriptions-name-unique.md)
- [sourceDescriptions-type](./sourceDescriptions-type.md)

## Resources

- Rule source: https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/x-security-scheme-name-link.ts
