# `GET` SHOULD NOT define `requestBody` schema

Authors:

- `@jeremyfiel` Jeremy Fiel (ADP)

## What this does and why

Following the HTTP standard and RESTful api principles, a `GET` operation SHOULD NOT include a `requestBody` in an attempt to modify a resource on the server, [RFC9110][1].

## Code

Add this to the `rules` section of your `redocly.yaml`:

```yaml
rules:
  rule/get-should-not-define-requestBody:
    severity: warn
    message: '"GET" SHOULD NOT define a "requestBody" schema'
    subject:
      type: Operation
      filterInParentKeys:
        - get
    assertions:
      disallowed:
        - requestBody
```

This rule will warn if any `PathItem` includes a `GET` operation with a `requestBody` schema definition.

## Examples

Here's a sample of an OpenAPI description:

```yaml
openapi: 3.0.3
info:
  title: Redocly Cafe
  version: 1.0.0
paths:
  /orders/{orderId}:
    get:
      summary: Retrieve an order
      description: Retrieve a single order by its ID.
      parameters:
        - name: orderId
          in: path
          description: ID of the order to retrieve.
          required: true
          schema:
            type: string
            pattern: ^ord_[0-9abcdefghjkmnpqrstvwxyz]{26}$
      requestBody: # <- This will warn
        description: a request body for my get operation
        content:
          'application/json':
            schema:
              type: object
              properties:
                customerName:
                  type: string
      responses:
        '200':
          description: Successful operation.
          content:
            application/json:
              schema:
                type: object
                properties:
                  customerName:
                    type: string
```

[1]: https://www.rfc-editor.org/rfc/rfc9110#section-9.3.1-6 'RFC9110'
