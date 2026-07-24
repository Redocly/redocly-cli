# Info must include Description

Authors:

- [`@adamaltman`](https://github.com/adamaltman), Adam Altman (Redocly)

## What this does and why

Ensures that the `info` section includes a `description` field. Including good metadata with your API can help discoverability, so you might like to include this rule in your ruleset.

This rule is an equivalent to Spectral's `info-description` rule, easily expressed in Redocly configurable rule syntax.

## Code

Configured in `redocly.yaml`, like this:

```yaml
rules:
  rule/info-description:
    subject:
      type: Info
      property: description
    assertions:
      defined: true
```

## Examples

An OpenAPI specification without a `description` in `info` will cause an error:

```yaml
openapi: 3.1.0
info:
  title: Redocly Cafe (a non-descriptive API)
paths: {}
```

Will give an error:

```text
rule/info-description failed because the Info description didn't meet the assertions: Should be defined
```

If you add a description, the check will pass.

## References

- [Spectral's info-description rule](https://docs.stoplight.io/docs/spectral/4dec24461f3af-open-api-rules#info-description)
