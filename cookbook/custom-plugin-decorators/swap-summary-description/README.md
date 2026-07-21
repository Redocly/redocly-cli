# Swap the summary and description fields

Authors:

- [`@lornajane`](https://github.com/lornajane), Lorna Mitchell (Redocly)

## What this does and why

We sometimes see API descriptions with the fields mixed up.
The most common of these is the `summary` and `description` fields on Operations in OpenAPI, some generators seem to produce the fields with the content reversed.

- Summary: used when the operations are displayed in a list, it should be a very short phrase to describe the operation.
- Description: used to supply more detail, used when the operation is displayed in detail. The description field also suports Markdown.

This decorator takes the content of both fields and (as long as there is some content in the description field), swaps them over.

## Code

The following code snippet shows the decorator, in a file named `swap-fields.js`:

```js
export default function plugin() {
  return {
    id: 'swap-fields',
    decorators: {
      oas3: {
        'summary-description': () => {
          return {
            Operation: {
              leave(target) {
                let description = '';
                let summary = '';
                if (target.description) {
                  description = target.description;
                }
                if (target.summary) {
                  summary = target.summary;
                }

                // only swap them if there is some description content
                if (description.length > 0) {
                  target.description = summary;
                  target.summary = description;
                }
              },
            },
          };
        },
      },
    },
  };
}
```

Put this file alongside your `redocly.yaml` file, and add the following configuration to `redocly.yaml`:

```yaml
plugins:
  - swap-fields.js

decorators:
  swap-fields/summary-description: on
```

When you run `redocly bundle`, the API description(s) will have their field order updated.

## Examples

Before the change, an example based on the [Redocly Cafe API](https://cafe.redocly.com/openapi/cafe) with the fields reversed (the problem was initially spotted in the [GitHub API Reference](https://github.com/github/rest-api-description)):

```yaml
openapi: 3.1.0
info:
  version: 1.0.0
  title: Redocly Cafe
  description: Demo API for cafe operators to manage menus, orders, and revenue.
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
  termsOfService: https://redocly.com/subscription-agreement
  contact:
    email: team@redocly.com
    url: https://redocly.com/contact-us/
webhooks:
  order-notification:
    post:
      summary: |-
        This event occurs when a new order is placed in the cafe.
        The payload contains the order ID, its status, and the time the event occurred.
        Use it to update kitchen displays, or to notify baristas that a new order is waiting.

        To subscribe to this event, register a webhook URL when creating your OAuth2 client.
      description: A new order was placed.
      operationId: orderNotificationWebhook
      requestBody:
        required: true
        content:
          application/json:
            schema:
              '$ref': '#/components/schemas/OrderNotification'
      responses:
        '200':
          description: Return a 200 status to indicate that the data was received successfully

components:
  schemas:
    OrderNotification:
      title: order notification event
      type: object
      properties:
        orderStatus:
          type: string
          enum:
            - placed
```

After the decorator has been run, the updated file looks like the following example:

```yaml
openapi: 3.1.0
info:
  version: 1.0.0
  title: Redocly Cafe
  description: Demo API for cafe operators to manage menus, orders, and revenue.
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
  termsOfService: https://redocly.com/subscription-agreement
  contact:
    email: team@redocly.com
    url: https://redocly.com/contact-us/
webhooks:
  order-notification:
    post:
      summary: A new order was placed.
      description: |-
        This event occurs when a new order is placed in the cafe.
        The payload contains the order ID, its status, and the time the event occurred.
        Use it to update kitchen displays, or to notify baristas that a new order is waiting.

        To subscribe to this event, register a webhook URL when creating your OAuth2 client.
      operationId: orderNotificationWebhook
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderNotification'
      responses:
        '200':
          description: Return a 200 status to indicate that the data was received successfully
components:
  schemas:
    OrderNotification:
      title: order notification event
      type: object
      properties:
        orderStatus:
          type: string
          enum:
            - placed
```

You could also edit the plugin to make other field changes as you need.

## References

- [Redocly Cafe API](https://cafe.redocly.com/openapi/cafe), the API the example is based on
- [GitHub REST API descriptions](https://github.com/github/rest-api-description), where the problem was initially spotted
- [OpenAPI reference](https://spec.openapis.org/oas/latest.html)
