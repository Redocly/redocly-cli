# Spot common mistakes

Authors:

- `@CidTori`

## What this does and why

This ruleset combines unopinionated rules to identify common mistakes and avoid oversights. The ruleset works well in combination with the [spec-compliant ruleset](../spec-compliant/).

## Code

You can use it in your `redocly.yaml` with [`extends`](https://redocly.com/docs/cli/configuration/extends/), or you can copy its content directly:

```yaml
rules:
  no-server-example.com: warn
  no-server-trailing-slash: warn
  no-ambiguous-paths: warn
  no-path-trailing-slash: warn
  operation-operationId: warn
  no-enum-type-mismatch: warn
  no-unused-components: warn
```

## References

Here is why each rule is included:

- `no-server-example.com`: most likely a copy-paste error from some example in a documentation
- `no-server-trailing-slash`: prevents double slash between the server and the endpoint path, no downside
- `no-ambiguous-paths`: ambiguous paths may be hard to see without a linter, and preventing them is a good practice
- `no-path-trailing-slash`: avoid confusion, no downside
- `operation-operationId`: as the rule itself says: "This rule is unopinionated."
- `no-enum-type-mismatch`: as the rule itself says: "Lack of compliance is most likely the result of a typo."
- `no-unused-components`: unused components are hard to spot without a linter, and most of the time you just want to remove them

Please, feel free to open issues or pull requests to suggest updates or additions to this ruleset.
