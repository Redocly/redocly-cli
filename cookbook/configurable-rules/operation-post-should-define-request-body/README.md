# `POST` SHOULD define `requestBody` schema

Authors:

- `@jeremyfiel` Jeremy Fiel (ADP)

## What this does and why

Following the HTTP standard and RESTful API principles, a `POST` request SHOULD include a `requestBody` indicating the contents of the request to the server. In some cases, when using a command pattern (`/actions/{action-id}`), you may allow a `requestBody` to be omitted; this rule provides for the option to ignore a particular URI pattern. The other constraint on this rule is the `deprecated` property should not be defined to avoid linting deprecated endpoints, unnecessarily.

## Code

Add this to the `rules` section of your `redocly.yaml`:

```yaml
rules:
  rule/post-should-define-requestBody:
    severity: error
    message: '"POST" SHOULD define a "requestBody" schema unless using an "actions" pattern'
    subject:
      type: Operation
    where:
      - subject:
          type: PathItem
          # Here you can define your own URI pattern to ignore if providing a requestBody is not required.
          # The negation happens in this portion of the regex `(?<!/actions)`.
          # The regex takes the entire URI pattern string and then uses a "negative lookbehind" from the end of the string to find the pattern to be negated.
          matchParentKeys: /^([\w-\{\}/.](?<!/actions))*$/
        assertions:
          defined: true
      - subject:
          type: Operation
          filterInParentKeys:
            - post
        assertions:
          disallowed:
            - deprecated
    assertions:
      required:
        - requestBody
```

This rule will error if any URI pattern, other than the ignored pattern, includes a `POST` request without the `requestBody` schema definition.
Note the `where` section is used to filter the rule to only apply to `POST`, non-`deprecated`, and optionally ignored URI patterns.

## Examples

Here's a sample of an OpenAPI description:

Only one error is expected from this example because the second URI includes the `/actions` pattern ignored by the rule.

```yaml
openapi: 3.0.3
info:
  title: Redocly Cafe
  version: 1.0.0
paths:
  /orders:
    post: # <-- This will error because there is no requestBody
      summary: Create order
      description: |
        Create a new order.
        Order items cannot be changed - if they need to be updated, cancel the order and place a new one.
      responses:
        '201':
          description: Order placed successfully.
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
  /orders/{orderId}/actions/{actionId}:
    post: # <-- No error because the /actions pattern is ignored by the rule
      summary: Perform an order action
      description: Perform an action on the order, such as canceling it.
      parameters:
        - name: orderId
          in: path
          description: ID of the order to act on.
          required: true
          schema:
            type: string
            pattern: ^ord_[0-9abcdefghjkmnpqrstvwxyz]{26}$
        - name: actionId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful operation.
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
```
