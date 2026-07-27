# Paths should not match a pattern

Authors:

- [`@tatomyr`](https://github.com/tatomyr) Andrew Tatomyr (Redocly)

## What this does and why

The [`no-http-verbs-in-paths` rule](https://redocly.com/docs/cli/rules/no-http-verbs-in-paths/#no-http-verbs-in-paths) is pre-built for a very specific set of patterns.
This rule is the general Swiss army knife version.
If you absolutely know something should not be in the path (for example `foo`), then add the pattern to prevent it.

Some common things to check using this rule: other common CRUD verbs, bad words, and internal code or terminology.

## Code

Add this to the `rules` section of your `redocly.yaml`:

```yaml
rules:
  rule/path-exclude-pattern:
    subject:
      type: Paths
    assertions:
      notPattern: \/wrong
```

If you want to exclude multiple patterns, you may write several rules like this each with a different pattern.

## Examples

Here's an example of an OpenAPI description:

```yaml
openapi: 3.1.0
info:
  title: Redocly Cafe
  version: 1.0.0
paths:
  /menu:
    $ref: ./menu.yaml
  /wrong-menu: # <-- This will error
    $ref: ./wrong-menu.yaml
```

## References

Built-in [`no-http-verbs-in-paths` rule](https://redocly.com/docs/cli/rules/no-http-verbs-in-paths/#no-http-verbs-in-paths).
