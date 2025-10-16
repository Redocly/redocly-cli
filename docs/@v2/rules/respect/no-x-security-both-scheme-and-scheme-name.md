# no-x-security-both-scheme-and-scheme-name

Forbids using both `scheme` and `schemeName` in the same `x-security` item.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Rationale

Each `x-security` entry must reference a security scheme in exactly one way—either embed the `scheme` object or reference it via `schemeName`.
You can include multiple `x-security` entries in a workflow; this rule applies to each entry individually. Using both `scheme` and `schemeName` in the same entry is ambiguous and is rejected by the runtime.

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

- [x-security-scheme-name-reference](./x-security-scheme-name-reference.md)
- [x-security-scheme-required-values](./x-security-scheme-required-values.md)

## Resources

- Rule source: https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/respect/no-x-security-both-scheme-and-scheme-name.ts
