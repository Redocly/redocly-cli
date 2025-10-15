# no-x-security-both-scheme-and-scheme-name

Forbids using both `scheme` and `schemeName` in the same `x-security` item.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Rationale

A single `x-security` item must reference a security scheme in exactly one way: either by embedding the `scheme` object or by referencing it with `schemeName`.
Having both is ambiguous and is rejected by the runtime.

## Configuration

| Option   | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default `off`. |

Example:

```yaml
rules:
  no-x-security-both-scheme-and-scheme-name: error
```

## Examples

Incorrect — both present:

```yaml
workflows:
  - workflowId: get-museum-hours
    x-security:
      - scheme:
          type: http
          scheme: bearer
        schemeName: BearerAuth
        values:
          token: some-token
```

Correct — only `scheme`:

```yaml
workflows:
  - workflowId: get-museum-hours
    x-security:
      - scheme:
          type: http
          scheme: bearer
        values:
          token: some-token
```

Correct — only `schemeName`:

```yaml
workflows:
  - workflowId: get-museum-hours
    x-security:
      - schemeName: BearerAuth
        values:
          token: some-token
```

## Related rules

- [x-security-scheme-name-link](./x-security-scheme-name-link.md)
- [x-security-scheme-required-values](../respect/x-security-scheme-required-values.md)

## Resources

- Rule source: https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/no-x-security-both-scheme-and-scheme-name.ts
