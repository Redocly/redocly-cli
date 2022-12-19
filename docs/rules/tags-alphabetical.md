# tags-alphabetical

Ensures that all tag `name` fields in the `tags` object are listed in alphabetical order.
Note that this rule does not automatically sort your tags if they are not in alphabetical order.
The rule only produces a warning or an error, and expects you to modify your API definitions.

|OAS|Compatibility|
|---|---|
|2.0|✅|
|3.0|✅|
|3.1|✅|


## API design principles

Information architecture is important. Among other benefits, it improves the efficiency and speed with which people discover information in the resources you provide.
When deciding how to organize tags in your API definitions and documentation, you can try different approaches through tree testing (we did some tree testing on Redocly documentation navigation).
However, sometimes it's easier to keep things simple, and go alphabetical. If you've already decided to alphabetize, this rule keeps it alphabetized.

We've been here and it's ugly:

> X: "Can't you see it's in alphabetical order?"
>
> Y: "Can't you talk to me like an adult?"
>
> X: "Don't adults know the alphabet?"

This rule is intended to prevent bikeshedding and diffuse tension between teammates (could be renamed to peacemaker).

## Configuration


|Option|Type|Description|
|---|---|---|
|severity|string|Possible values: `off`, `warn`, `error`. Default `off` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  tags-alphabetical: error
```

## Examples

Given this configuration:

```yaml
rules:
  tags-alphabetical: error
```

Example of **incorrect** tags:

```yaml Bad example
tags:
  - name: Partner APIs
  - name: External APIs
  - name: Testing APIs
  - name: Central Management APIs
```

Example of **correct** tags:

```yaml Good example
tags:
  - name: Central Management APIs
  - name: External APIs
  - name: Partner APIs
  - name: Testing APIs
```

## Related rules

- [tag-description](./tag-description.md)
- [operation-description](./operation-description.md)
- [custom rules](./custom-rules.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/common/tags-alphabetical.ts)
- [Tags docs](https://redocly.com/docs/openapi-visual-reference/tags/)
