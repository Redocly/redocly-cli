# spec-no-invalid-runtime-expressions

Requires the fields that the Arazzo specification defines as a runtime expression to follow the runtime expression syntax.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

A runtime expression, such as `$response.body#/id`, reads a value from a request, a response, the inputs, or the outputs while a workflow runs.
The Arazzo specification defines the syntax of a runtime expression with an ABNF grammar.
A value that does not follow the grammar, for example a misspelled `$resposne.body#/id`, is not an expression.
A tool can only read it as a constant, so the workflow passes the text itself instead of the value it was meant to reference.

The specification gives these fields the `{expression}` type, and the rule checks each of them:

- the values of the `outputs` of a workflow or a step
- the `context` of a criterion
- the `context` of a selector object (Arazzo 1.1)
- the `reference` of a reusable object

The `spec-no-invalid-runtime-expressions` rule also checks each expression that the `operationPath` or the `channelPath` of a step embeds in curly braces, such as `{$sourceDescriptions.cafe-api.url}`.

An output value can also be a constant or a string that embeds expressions in curly braces, such as `Bearer {$response.body#/token}`.
The specification does not define these forms for `outputs`, but Respect evaluates them, so the rule accepts them.
In `outputs`, the rule reports a value that starts with `$` and is not a valid runtime expression, and each embedded expression that is not valid.

The rule checks a value against the grammar of the Arazzo version of the description.
Arazzo 1.1 adds the `$self` and `$message` expressions and the `payload` source.
It also defines the form of the other expressions, so `$steps.create-order.orderId` and `$components.schemas.Order` are valid in Arazzo 1.0 and invalid in Arazzo 1.1.

The rule does not check the `value` of a parameter or a payload replacement, the `payload` of a request body, or the `condition` of a criterion.
The specification allows a constant in those fields.
To check that a `$steps` or a `$workflows` expression references an existing output, use the [outputs-defined](./outputs-defined.md) rule.

## Configuration

| Option   | Type   | Description                                                                                 |
| -------- | ------ | ------------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default: `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  spec-no-invalid-runtime-expressions: error
```

## Examples

Given the following configuration:

```yaml
rules:
  spec-no-invalid-runtime-expressions: error
```

Example of **incorrect** runtime expressions:

```yaml Incorrect example
workflows:
  - workflowId: place-order
    steps:
      - stepId: create-order
        operationId: cafe-api.createOrder
        successCriteria:
          - context: $response
            condition: $.id
            type: jsonpath
        outputs:
          orderId: $resposne.body#/id
          status: $response.body.status
```

Example of **correct** runtime expressions:

```yaml Correct example
workflows:
  - workflowId: place-order
    steps:
      - stepId: create-order
        operationId: cafe-api.createOrder
        successCriteria:
          - context: $response.body
            condition: $.id
            type: jsonpath
        outputs:
          orderId: $response.body#/id
          status: $response.body#/status
    outputs:
      orderId: $steps.create-order.outputs.orderId
```

## Related rules

- [outputs-defined](./outputs-defined.md)
- [spec-outputs-invalid-map-name](./spec-outputs-invalid-map-name.md)
- [spec-sourceDescriptions-defined](./spec-sourceDescriptions-defined.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/spec-no-invalid-runtime-expressions.ts)
- [Runtime Expressions](https://spec.openapis.org/arazzo/latest.html#runtime-expressions) in the Arazzo specification
