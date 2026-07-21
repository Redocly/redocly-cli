# `DELETE` SHOULD NOT define `requestBody` schema

Authors:

- `@jeremyfiel` Jeremy Fiel (ADP)

## What this does and why

Following the HTTP standard and RESTful api principles, a `DELETE` operation SHOULD NOT include a `requestBody` in an attempt to modify a resource on the server, [RFC9110][1].

## Code

Add this to the `rules` section of your `redocly.yaml`:

```yaml
rules:
  rule/delete-should-not-define-requestBody:
    severity: warn
    message: '"DELETE" SHOULD NOT define a "requestBody" schema'
    subject:
      type: Operation
      filterInParentKeys:
        - delete
    assertions:
      disallowed:
        - requestBody
```

This rule will warn if any `PathItem` includes a `DELETE` operation with a `requestBody` schema definition.

## Examples

Here's a sample of an OpenAPI description:

```yaml
openapi: 3.0.3
info:
  title: Redocly Cafe
  version: 1.0.0
paths:
  /orders/{orderId}:
    delete:
      summary: Delete an order
      description: |
        Delete the order.
        To keep the order history, cancel the order instead of deleting it.
      parameters:
        - name: orderId
          in: path
          description: ID of the order to delete.
          required: true
          schema:
            type: string
            pattern: ^ord_[0-9abcdefghjkmnpqrstvwxyz]{26}$
      requestBody: # <-- This will error
        description: a request body for my delete operation
        content:
          'application/json':
            schema:
              type: object
              properties:
                reason:
                  type: string
      responses:
        '204':
          description: Order deleted successfully.
```

[1]: https://www.rfc-editor.org/rfc/rfc9110#section-9.3.5-6 'RFC9110'
