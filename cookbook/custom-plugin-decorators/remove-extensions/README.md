# Remove extensions

Authors:

- @nicobao (when working full time at @CIDgravity)

## What this does and why

Go through each node of an OpenAPI document, and remove any given [OpenAPI Extensions](https://spec.openapis.org/oas/v3.1.0#specification-extensions) (must start with `x-`).

Why? See <https://github.com/Redocly/redocly-cli/issues/867#issuecomment-1816872180>

## Code

The plugin itself can be found in [`remove-extensions.js`](./remove-extensions.js). The rest of this section shows you how to set up and use the plugin.

Create a `plugin.js` file to refer to this file:

```js
import RemoveExtensions from './remove-extensions';

/** @type {import('@redocly/cli').DecoratorsConfig} */
const decorators = {
  oas3: {
    'remove-extensions': RemoveExtensions,
  },
};

export default function plugin() {
  return {
    id: 'plugin',
    decorators,
  };
}
```

Create/edit `redocly.yaml` as follows (edit with your own settings):

```yml
apis:
  unchanged@latest:
    root: ./cafe.yaml
  with-plugin@latest:
    root: ./cafe.yaml
    decorators:
      plugin/remove-extensions:
        extensions:
          - x-amazon*
          - x-google*
plugins:
  - ./plugin.js
```

Run the `bundle` command to remove all the [GCP](https://cloud.google.com/endpoints/docs/openapi/openapi-extensions) and [AWS](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions.html) custom OpenAPI extensions from the OpenAPI description:

```bash
redocly bundle with-plugin@latest --output dist/with-plugin.yaml
```

The `extensions` parameter is optional. If empty or not set, it will remove all extensions (elements starting with `x-`). The accepted values for the `extensions` param are:

- `extensions: <regex-valid-extension>`
- `extensions: <list-of-regex-valid-extension>`
- `extensions: <empty>`

Regular expressions follow [Javascript Regex convention](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions).

## Examples

With the same config as above.

Input OpenAPI (`cafe.yaml`):

```yaml
openapi: 3.0.0
info:
  description: 'This is a sample Redocly Cafe server. Cafe operators (not customers) use
    it to manage menus, orders, and revenue. Find out more at
    [https://cafe.redocly.com](https://cafe.redocly.com).'
  version: 1.0.0
  title: Redocly Cafe
  termsOfService: https://redocly.com/subscription-agreement
  contact:
    email: team@redocly.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
tags:
  - name: Products
    description: Operations related to products
    externalDocs:
      description: Find out more
      url: https://cafe.redocly.com
  - name: Orders
    description: Order management operations
x-amazon-apigateway-api-key-source: HEADER
paths:
  /menu:
    get:
      x-google-plugin-key-auth:
        name: key-auth
        enabled: true
      tags:
        - Products
      summary: List all menu items
      description: Retrieve a collection of menu items with optional filtering
      operationId: listMenuItems
      parameters:
        - name: search
          in: query
          description: Text search across menu item fields
          required: false
          schema:
            type: string
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/MenuItem'
        '400':
          description: Invalid search value
    post:
      x-google-plugin-key-auth:
        name: key-auth
        enabled: true
      x-internal: true
      tags:
        - Products
      summary: Create menu item
      description: ''
      operationId: createMenuItem
      requestBody:
        $ref: '#/components/requestBodies/MenuItem'
      responses:
        '201':
          description: Menu item created
        '400':
          description: Invalid input
  /orders:
    get:
      x-google-plugin-key-auth:
        name: key-auth
        enabled: true
      tags:
        - Orders
      summary: List all orders
      description: Multiple status values can be provided with comma separated strings.
        Use placed, preparing, completed for testing.
      operationId: listOrders
      parameters:
        - name: status
          in: query
          description: Status values used to filter orders
          required: false
          explode: true
          schema:
            type: array
            items:
              type: string
              enum:
                - placed
                - preparing
                - completed
                - canceled
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Order'
        '400':
          description: Invalid status value
  '/orders/{orderId}':
    get:
      tags:
        - Orders
      summary: Retrieve an order
      description: Returns a single order
      operationId: getOrderById
      parameters:
        - name: orderId
          in: path
          description: ID of the order to retrieve
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '400':
          description: Invalid ID supplied
        '404':
          description: Order not found
externalDocs:
  description: Find out more about Redocly Cafe
  url: https://cafe.redocly.com
servers:
  - url: https://api.cafe.redocly.com
components:
  requestBodies:
    MenuItem:
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/MenuItem'
      description: Menu item that needs to be added to the menu
      required: true
  schemas:
    OrderItem:
      type: object
      required:
        - menuItemId
        - quantity
      properties:
        menuItemId:
          type: string
        quantity:
          type: integer
          minimum: 1
        comment:
          type: string
          example: No sugar!
    MenuItem:
      type: object
      required:
        - name
        - price
      properties:
        id:
          type: string
          example: prd_01h1s5z6vf2mm1mz3hevnn9va7
        name:
          x-internal: true
          type: string
          example: Cappuccino
        price:
          type: integer
          description: Price in cents
          example: 4500
        category:
          x-internal: true
          type: string
          description: Menu item category
          enum:
            - beverage
            - dessert
    Order:
      type: object
      required:
        - customerName
        - orderItems
      properties:
        id:
          type: string
          example: ord_01h1s5z6vf2mm1mz3hevnn9va7
        customerName:
          type: string
          example: Mary Ann
        status:
          x-internal: true
          type: string
          description: order status in the cafe
          enum:
            - placed
            - preparing
            - completed
            - canceled
        orderItems:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
```

Output OpenAPI (`with-plugin.yaml`):

```yaml
openapi: 3.0.0
info:
  description: This is a sample Redocly Cafe server. Cafe operators (not customers) use it to manage menus, orders, and revenue. Find out more at [https://cafe.redocly.com](https://cafe.redocly.com).
  version: 1.0.0
  title: Redocly Cafe
  termsOfService: https://redocly.com/subscription-agreement
  contact:
    email: team@redocly.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
servers:
  - url: https://api.cafe.redocly.com
tags:
  - name: Products
    description: Operations related to products
    externalDocs:
      description: Find out more
      url: https://cafe.redocly.com
  - name: Orders
    description: Order management operations
externalDocs:
  description: Find out more about Redocly Cafe
  url: https://cafe.redocly.com
paths:
  /menu:
    get:
      tags:
        - Products
      summary: List all menu items
      description: Retrieve a collection of menu items with optional filtering
      operationId: listMenuItems
      parameters:
        - name: search
          in: query
          description: Text search across menu item fields
          required: false
          schema:
            type: string
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/MenuItem'
        '400':
          description: Invalid search value
    post:
      x-internal: true
      tags:
        - Products
      summary: Create menu item
      description: ''
      operationId: createMenuItem
      requestBody:
        $ref: '#/components/requestBodies/MenuItem'
      responses:
        '201':
          description: Menu item created
        '400':
          description: Invalid input
  /orders:
    get:
      tags:
        - Orders
      summary: List all orders
      description: Multiple status values can be provided with comma separated strings. Use placed, preparing, completed for testing.
      operationId: listOrders
      parameters:
        - name: status
          in: query
          description: Status values used to filter orders
          required: false
          explode: true
          schema:
            type: array
            items:
              type: string
              enum:
                - placed
                - preparing
                - completed
                - canceled
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Order'
        '400':
          description: Invalid status value
  /orders/{orderId}:
    get:
      tags:
        - Orders
      summary: Retrieve an order
      description: Returns a single order
      operationId: getOrderById
      parameters:
        - name: orderId
          in: path
          description: ID of the order to retrieve
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '400':
          description: Invalid ID supplied
        '404':
          description: Order not found
components:
  requestBodies:
    MenuItem:
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/MenuItem'
      description: Menu item that needs to be added to the menu
      required: true
  schemas:
    OrderItem:
      type: object
      required:
        - menuItemId
        - quantity
      properties:
        menuItemId:
          type: string
        quantity:
          type: integer
          minimum: 1
        comment:
          type: string
          example: No sugar!
    MenuItem:
      type: object
      required:
        - name
        - price
      properties:
        id:
          type: string
          example: prd_01h1s5z6vf2mm1mz3hevnn9va7
        name:
          x-internal: true
          type: string
          example: Cappuccino
        price:
          type: integer
          description: Price in cents
          example: 4500
        category:
          x-internal: true
          type: string
          description: Menu item category
          enum:
            - beverage
            - dessert
    Order:
      type: object
      required:
        - customerName
        - orderItems
      properties:
        id:
          type: string
          example: ord_01h1s5z6vf2mm1mz3hevnn9va7
        customerName:
          type: string
          example: Mary Ann
        status:
          x-internal: true
          type: string
          description: order status in the cafe
          enum:
            - placed
            - preparing
            - completed
            - canceled
        orderItems:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
```

## References

Copyright CIDgravity, @nicobao, 2022.

Copy-pasted from:

- https://github.com/CIDgravity/redoc-plugins
- https://github.com/nicobao/redoc-plugins

This decorator was originally licensed under both the Apache v2 license and the MIT license.
