# `tree`

## Introduction

The `tree` command explores the structure of an API description: an overview of its tags, paths, operations, webhooks, and components, plus typed selectors to drill into exactly one of them.
Every result is attributed to the file that defines it, so a multi-file API shows which file each operation or component lives in.

Use `tree` to:

- Get quick orientation in any API, whether single-file or multi-file: an overview first, then drill into one tag, path, webhook, operation, or component.
- Run impact analysis with `--used-by` — which operations and components depend on a given selection.
  This analysis is useful in CI and automated code review.
- Fetch everything an operation or component needs — its raw source and the transitive `$ref` closure — with `--with-deps`.
- Produce machine-readable JSON for LLM agents and tooling with `--format=json`.
- View the file-level `$ref` graph with `--files`.

Every selector, listing, and modifier below works with OpenAPI 2.0 and 3.x.
AsyncAPI and Arazzo descriptions are supported too, but they have no paths or operations to select: the default view (and `--files`) render their `$ref` dependency tree instead, and the typed selectors are OpenAPI-only — see [Selector errors](#selector-errors).

## Usage

```bash
redocly tree
redocly tree <api>
redocly tree <api> --tag=<tag>
redocly tree <api> --path=<path> [--operation=<method>]
redocly tree <api> --webhook=<name> [--operation=<method>]
redocly tree <api> --operation=<operationId>
redocly tree <api> --component=<section> [--name=<name>]
redocly tree <api> --path=<path> --operation=<method> [--with-deps]
redocly tree <api> --component=<section> --name=<name> [--used-by | --with-deps]
redocly tree <api> --paths
redocly tree <api> --operations
redocly tree <api> [--format=stylish|json] [--output=<file>] [--config=<path>]
redocly tree --files [apis...]
```

With no API argument, the command takes the API from the Redocly configuration file.
The default view shows one API's overview at a time; pass a single API, or use `--files` for the multi-API file graph.

## Options

| Option        | Type     | Description                                                                                                                                                                                             |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| apis          | [string] | In the default view, one API description file or alias. In `--files` mode, one or more files or aliases. Defaults to the APIs from the Redocly configuration file.                                      |
| --tag         | string   | Show the operations of one tag.                                                                                                                                                                         |
| --path        | string   | Show the operations of one path. Combine with `--operation` to select a single operation on that path.                                                                                                  |
| --webhook     | string   | Show the operations of one webhook. Combine with `--operation` to select a single webhook operation.                                                                                                    |
| --operation   | string   | Show one operation: an HTTP method (with `--path` or `--webhook`) or an operationId on its own. A value that looks like an HTTP method without `--path`/`--webhook` is rejected with a hint to add one. |
| --component   | string   | Show a component section (`schemas`, `responses`, `parameters`, `requestBodies`, `headers`, `securitySchemes`, `examples`, `links`, `callbacks`) or, with `--name`, one component.                      |
| --name        | string   | Component name; requires `--component`.                                                                                                                                                                 |
| --paths       | boolean  | List every path with its methods.                                                                                                                                                                       |
| --operations  | boolean  | List every operation. Webhooks aren't included; select them with `--webhook`.                                                                                                                           |
| --used-by     | boolean  | With an operation or a component (`--component` + `--name`) selection, show every operation and component that transitively depends on it.                                                              |
| --with-deps   | boolean  | With an operation or a component (`--component` + `--name`) selection, add its raw source lines and the transitive `$ref` closure, capped at 64 KB with a `truncated` marker.                           |
| --files       | boolean  | Show the file-level `$ref` graph instead of the API structure. Doesn't accept the typed selectors, `--paths`, `--operations`, `--used-by`, or `--with-deps`.                                            |
| --format      | string   | Output format: `stylish` (default, human-readable) or `json` (machine-readable, the same selection as data).                                                                                            |
| --output, -o  | string   | Write the output to a file instead of `stdout`.                                                                                                                                                         |
| --config      | string   | Specify the path to the [Redocly configuration file](../configuration/index.md).                                                                                                                        |
| --lint-config | string   | Specify the severity level for the configuration file. **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                                            |
| --help        | boolean  | Display help.                                                                                                                                                                                           |
| --version     | boolean  | Display version number.                                                                                                                                                                                 |

Selectors combine only in the shapes shown under _Usage_ above; other combinations are a usage error.
For example, `--tag` and `--component` each select a different, unrelated scope, so combining them fails fast:

```
Arguments component and tag are mutually exclusive
```

See [Selector errors](#selector-errors) for the full set of these checks.

## Examples

### Get an overview of an API description

With no selector, `tree` prints a bounded overview: the info summary, servers, every tag with its operation count, the webhook count, and every component section with its count.

```bash
redocly tree cafe.yaml
```

```
Redocly Cafe — Demo API for cafe operators (not customers) to manage menus, orders, and revenue. Create API credentials and try it yourself in a realistic…  (oas3_2)
Servers: https://api.cafe.redocly.com
Operations: 12 across 4 tags
  Authorization (1) — Create a client to demo the API.
  Products (4) — Operations related to products.
  Orders (6) — Order management operations.
  Statistics (1) — Statistics operations.
Webhooks: 1
Components: schemas 15 · responses 6 · parameters 9 · securitySchemes 2
```

`--format=json` prints the same overview as data — a few kilobytes for any spec size, since it never lists individual operations or components:

```bash
redocly tree cafe.yaml --format=json
```

```json
{
  "docName": "cafe.yaml",
  "spec": "oas3_2",
  "docDescription": "Redocly Cafe — Demo API for cafe operators (not customers) to manage menus, orders, and revenue. Create API credentials and try it yourself in a realistic…",
  "overview": {
    "pointer": "#/info",
    "file": "cafe.yaml",
    "start_line": 3,
    "end_line": 16,
    "summary": "Demo API for cafe operators (not customers) to manage menus, orders, and revenue. Create API credentials and try it yourself in a realistic OpenAPI workflow."
  },
  "servers": {
    "pointer": "#/servers",
    "file": "cafe.yaml",
    "start_line": 18,
    "end_line": 19,
    "urls": ["https://api.cafe.redocly.com"]
  },
  "tags": [
    { "name": "Authorization", "summary": "Create a client to demo the API.", "operations": 1 },
    { "name": "Products", "summary": "Operations related to products.", "operations": 4 },
    { "name": "Orders", "summary": "Order management operations.", "operations": 6 },
    { "name": "Statistics", "summary": "Statistics operations.", "operations": 1 }
  ],
  "webhooks": 1,
  "components": [
    { "section": "schemas", "count": 15 },
    { "section": "responses", "count": 6 },
    { "section": "parameters", "count": 9 },
    { "section": "securitySchemes", "count": 2 }
  ]
}
```

### List the operations of a tag

```bash
redocly tree cafe.yaml --tag=Orders
```

```
/orders
  GET "List all orders" 229..314 [Orders]
  POST "Create order" 316..372 [Orders]
/orders/{orderId}
  GET "Retrieve an order" 375..416 [Orders]
  DELETE "Delete an order" 478..502 [Orders]
  PATCH "Partially update an order" 418..476 [Orders]
/order-items
  GET "List all order items with menu item details" 505..546 [Orders]
```

`--format=json` returns the same operations as a flat list, one entry per operation:

```bash
redocly tree cafe.yaml --tag=Orders --format=json
```

```json
[
  {
    "method": "get",
    "path": "/orders",
    "operationId": "listOrders",
    "summary": "List all orders",
    "tags": ["Orders"],
    "pointer": "#/paths/~1orders/get",
    "file": "cafe.yaml",
    "start_line": 229,
    "end_line": 314
  },
  {
    "method": "post",
    "path": "/orders",
    "operationId": "createOrder",
    "summary": "Create order",
    "tags": ["Orders"],
    "pointer": "#/paths/~1orders/post",
    "file": "cafe.yaml",
    "start_line": 316,
    "end_line": 372
  },
  {
    "method": "get",
    "path": "/orders/{orderId}",
    "operationId": "getOrderById",
    "summary": "Retrieve an order",
    "tags": ["Orders"],
    "pointer": "#/paths/~1orders~1{orderId}/get",
    "file": "cafe.yaml",
    "start_line": 375,
    "end_line": 416
  },
  {
    "method": "delete",
    "path": "/orders/{orderId}",
    "operationId": "deleteOrder",
    "summary": "Delete an order",
    "tags": ["Orders"],
    "pointer": "#/paths/~1orders~1{orderId}/delete",
    "file": "cafe.yaml",
    "start_line": 478,
    "end_line": 502
  },
  {
    "method": "patch",
    "path": "/orders/{orderId}",
    "operationId": "updateOrder",
    "summary": "Partially update an order",
    "tags": ["Orders"],
    "pointer": "#/paths/~1orders~1{orderId}/patch",
    "file": "cafe.yaml",
    "start_line": 418,
    "end_line": 476
  },
  {
    "method": "get",
    "path": "/order-items",
    "operationId": "listOrderItems",
    "summary": "List all order items with menu item details",
    "tags": ["Orders"],
    "pointer": "#/paths/~1order-items/get",
    "file": "cafe.yaml",
    "start_line": 505,
    "end_line": 546
  }
]
```

`--tag` is mutually exclusive with `--path`, `--webhook`, `--component`, and `--operation` on its own (an operationId can't disambiguate which tag it belongs to when both are given).

### List the operations of a path

```bash
redocly tree cafe.yaml --path=/orders
```

```
/orders
  GET "List all orders" 229..314 [Orders]
  POST "Create order" 316..372 [Orders]
```

The JSON shape is the same flat list of operation entries shown under `--tag` above.
`--path` is mutually exclusive with `--tag` and `--webhook`.

### Get one operation

Add `--operation` with an HTTP method to select a single operation on that path:

```bash
redocly tree cafe.yaml --path=/orders --operation=post --format=json
```

```json
{
  "method": "post",
  "path": "/orders",
  "operationId": "createOrder",
  "summary": "Create order",
  "tags": ["Orders"],
  "pointer": "#/paths/~1orders/post",
  "file": "cafe.yaml",
  "start_line": 316,
  "end_line": 372,
  "description": "Create a new order. Order items cannot be changed - if they need to be updated, cancel the order and place a new one.",
  "refs": [
    {
      "ref": "#/components/responses/BadRequest",
      "resolved": true,
      "file": "cafe.yaml",
      "pointer": "#/components/responses/BadRequest",
      "start_line": 1327,
      "end_line": 1331,
      "component": "responses",
      "name": "BadRequest"
    },
    {
      "ref": "#/components/responses/Forbidden",
      "resolved": true,
      "file": "cafe.yaml",
      "pointer": "#/components/responses/Forbidden",
      "start_line": 1345,
      "end_line": 1349,
      "component": "responses",
      "name": "Forbidden"
    },
    {
      "ref": "#/components/responses/InternalServerError",
      "resolved": true,
      "file": "cafe.yaml",
      "pointer": "#/components/responses/InternalServerError",
      "start_line": 1333,
      "end_line": 1337,
      "component": "responses",
      "name": "InternalServerError"
    },
    {
      "ref": "#/components/responses/Unauthorized",
      "resolved": true,
      "file": "cafe.yaml",
      "pointer": "#/components/responses/Unauthorized",
      "start_line": 1339,
      "end_line": 1343,
      "component": "responses",
      "name": "Unauthorized"
    },
    {
      "ref": "#/components/schemas/Order",
      "resolved": true,
      "file": "cafe.yaml",
      "pointer": "#/components/schemas/Order",
      "start_line": 1033,
      "end_line": 1107,
      "component": "schemas",
      "name": "Order"
    }
  ],
  "usedBy": []
}
```

`refs` is the operation's one-hop outgoing references, typed by component section; `usedBy` is one-hop incoming references (usually empty for operations — nothing else in the description points to an operation).

An operationId also selects an operation on its own, without `--path`:

```bash
redocly tree cafe.yaml --operation=createOrder --format=json
```

This returns the same card shown above.
A bare `--operation` value that looks like an HTTP method is rejected, since it's ambiguous without a path or webhook to scope it:

```bash
redocly tree cafe.yaml --operation=post
```

```
"post" looks like an HTTP method. Add --path (or --webhook) to select the operation, or pass an operationId.
```

### Webhooks

`--webhook` lists a webhook's operations the same way `--path` lists a path's:

```bash
redocly tree cafe.yaml --webhook=order-notification
```

```
order-notification
  POST "Order notification webhook" 665..683 [Orders]
```

Add `--operation` for a single webhook operation card:

```bash
redocly tree cafe.yaml --webhook=order-notification --operation=post --format=json
```

```json
{
  "method": "post",
  "webhook": "order-notification",
  "operationId": "orderNotificationWebhook",
  "summary": "Order notification webhook",
  "tags": ["Orders"],
  "pointer": "#/webhooks/order-notification/post",
  "file": "cafe.yaml",
  "start_line": 665,
  "end_line": 683,
  "description": "Webhook triggered when a new order is placed.",
  "refs": [
    {
      "ref": "#/components/responses/BadRequest",
      "resolved": true,
      "file": "cafe.yaml",
      "pointer": "#/components/responses/BadRequest",
      "start_line": 1327,
      "end_line": 1331,
      "component": "responses",
      "name": "BadRequest"
    },
    {
      "ref": "#/components/responses/InternalServerError",
      "resolved": true,
      "file": "cafe.yaml",
      "pointer": "#/components/responses/InternalServerError",
      "start_line": 1333,
      "end_line": 1337,
      "component": "responses",
      "name": "InternalServerError"
    },
    {
      "ref": "#/components/schemas/OrderNotification",
      "resolved": true,
      "file": "cafe.yaml",
      "pointer": "#/components/schemas/OrderNotification",
      "start_line": 1310,
      "end_line": 1324,
      "component": "schemas",
      "name": "OrderNotification"
    }
  ],
  "usedBy": []
}
```

`--webhook` is mutually exclusive with `--tag` and `--path`.

### Component sections and one component

`--component` lists every component in a section: name, pointer location, lines, and a one-line description when the component has one.

```bash
redocly tree cafe.yaml --component=schemas
```

```
schemas:
  Page 823..867
  MenuBaseItem 868..923
  Beverage 924..943
  Dessert 944..959
  MenuItem 960..970
  MenuItemList 971..987
  Error 988..1024
  OrderStatus "Order status." 1025..1032
  Order 1033..1107
  OrderList 1108..1124
  OrderItem 1125..1152
  RevenueStatistics "Revenue statistics for a given date range." 1153..1206
  RegisterClientObject 1207..1239
  OAuth2Client "OAuth2 client registration response. Per RFC 7591, includes the client identifier, secret, timestamps, and all registered client metadata." 1240..1309
  OrderNotification 1310..1324
```

Accepted section names are `schemas`, `responses`, `parameters`, `requestBodies`, `headers`, `securitySchemes`, `examples`, `links`, and `callbacks`.
An unknown section lists the valid ones:

```bash
redocly tree cafe.yaml --component=widgets
```

```
Unknown component section "widgets". Sections: schemas, responses, parameters, requestBodies, headers, securitySchemes, examples, links, callbacks.
```

Add `--name` for a single component card, with its one-hop `refs` and `usedBy`:

```bash
redocly tree cafe.yaml --component=schemas --name=Order
```

```
schemas/Order
file: cafe.yaml#/components/schemas/Order
lines: 1033..1107
refs:
  - schemas/OrderStatus  #/components/schemas/OrderStatus  1025..1032
usedBy:
  - GET /orders/{orderId}  #/paths/~1orders~1{orderId}/get  375..416
  - PATCH /orders/{orderId}  #/paths/~1orders~1{orderId}/patch  418..476
  - POST /orders  #/paths/~1orders/post  316..372
  - schemas/OrderList  #/components/schemas/OrderList  1108..1124
```

`usedBy` here shows every operation and component with a direct reference to `Order` — one hop only; for the transitive version see `--used-by` below.
`--component` is mutually exclusive with `--tag`, `--path`, `--webhook`, and `--operation`.

Component addressing by `--component`/`--name` requires the root document to declare the component (`components: {schemas: {Order: {$ref: ./Order.yaml}}}` or inline).
A fully split layout with no root registry — where operation files reference component files directly, as [`redocly split`](./split.md) produces — has nothing to list.
The example below runs against a multi-file version of the same API (a directory produced by [split](./split.md)).

```bash
redocly tree cafe-split/cafe.yaml --component=schemas
```

```
schemas:
```

Use `--files` to see those components' files instead, or read a card's `refs[].file`/`usedBy[].file`.

### List every path or every operation

`--paths` lists every path with its methods, across the whole description:

```bash
redocly tree cafe.yaml --paths
```

```
/menu  [get, post]  31..173
/menu/{menuItemId}  [delete]  175..198
/menu-item-images/{menuItemId}  [get]  200..226
/orders  [get, post]  228..372
/orders/{orderId}  [get, delete, patch]  374..502
/order-items  [get]  504..546
/revenue  [get]  548..601
/oauth2/register  [post]  603..661
```

`--operations` lists every operation the same way `--tag` does, but for the whole description:

```bash
redocly tree cafe.yaml --operations
```

```
/menu
  GET "List all menu items" 32..111 [Products]
  POST "Create menu item" 113..173 [Products]
/menu/{menuItemId}
  DELETE "Delete a menu item" 178..198 [Products]
/menu-item-images/{menuItemId}
  GET "Retrieve a menu item photo" 203..226 [Products]
/orders
  GET "List all orders" 229..314 [Orders]
  POST "Create order" 316..372 [Orders]
/orders/{orderId}
  GET "Retrieve an order" 375..416 [Orders]
  DELETE "Delete an order" 478..502 [Orders]
  PATCH "Partially update an order" 418..476 [Orders]
/order-items
  GET "List all order items with menu item details" 505..546 [Orders]
/revenue
  GET "Get revenue statistics" 549..601 [Statistics]
/oauth2/register
  POST "Create OAuth2 client" 604..661 [Authorization]
```

Neither listing includes webhooks; select those with `--webhook`.
Both are mutually exclusive with every selector — they're already "give me everything," so a narrower selector alongside them makes no sense.

### Fetch everything a selection needs: `--with-deps`

Add `--with-deps` to an operation or component selection to append its raw source (`content`) and the transitive `$ref` closure (`deps`), each entry with its own `content` and one-hop `refs`, in dependency order, capped at 64 KB with a `truncated` marker:

```bash
redocly tree cafe.yaml --path=/orders --operation=post --with-deps --format=json
```

```json
{
  "method": "post",
  "path": "/orders",
  "operationId": "createOrder",
  "summary": "Create order",
  "tags": ["Orders"],
  "pointer": "#/paths/~1orders/post",
  "file": "cafe.yaml",
  "start_line": 316,
  "end_line": 372,
  "description": "Create a new order. Order items cannot be changed - if they need to be updated, cancel the order and place a new one.",
  "refs": [
    {
      "ref": "#/components/responses/BadRequest",
      "resolved": true,
      "file": "cafe.yaml",
      "pointer": "#/components/responses/BadRequest",
      "start_line": 1327,
      "end_line": 1331,
      "component": "responses",
      "name": "BadRequest"
    },
    {
      "ref": "#/components/responses/Forbidden",
      "resolved": true,
      "file": "cafe.yaml",
      "pointer": "#/components/responses/Forbidden",
      "start_line": 1345,
      "end_line": 1349,
      "component": "responses",
      "name": "Forbidden"
    },
    {
      "ref": "#/components/responses/InternalServerError",
      "resolved": true,
      "file": "cafe.yaml",
      "pointer": "#/components/responses/InternalServerError",
      "start_line": 1333,
      "end_line": 1337,
      "component": "responses",
      "name": "InternalServerError"
    },
    {
      "ref": "#/components/responses/Unauthorized",
      "resolved": true,
      "file": "cafe.yaml",
      "pointer": "#/components/responses/Unauthorized",
      "start_line": 1339,
      "end_line": 1343,
      "component": "responses",
      "name": "Unauthorized"
    },
    {
      "ref": "#/components/schemas/Order",
      "resolved": true,
      "file": "cafe.yaml",
      "pointer": "#/components/schemas/Order",
      "start_line": 1033,
      "end_line": 1107,
      "component": "schemas",
      "name": "Order"
    }
  ],
  "usedBy": [],
  "content": "…",
  "deps": [
    {
      "id": "responses/BadRequest",
      "pointer": "#/components/responses/BadRequest",
      "file": "cafe.yaml",
      "start_line": 1327,
      "end_line": 1331,
      "content": "…",
      "refs": [
        {
          "ref": "#/components/schemas/Error",
          "resolved": true,
          "file": "cafe.yaml",
          "pointer": "#/components/schemas/Error",
          "start_line": 988,
          "end_line": 1024
        }
      ]
    },
    {
      "id": "responses/Forbidden",
      "pointer": "#/components/responses/Forbidden",
      "file": "cafe.yaml",
      "start_line": 1345,
      "end_line": 1349,
      "content": "…",
      "refs": [
        {
          "ref": "#/components/schemas/Error",
          "resolved": true,
          "file": "cafe.yaml",
          "pointer": "#/components/schemas/Error",
          "start_line": 988,
          "end_line": 1024
        }
      ]
    },
    {
      "id": "responses/InternalServerError",
      "pointer": "#/components/responses/InternalServerError",
      "file": "cafe.yaml",
      "start_line": 1333,
      "end_line": 1337,
      "content": "…",
      "refs": [
        {
          "ref": "#/components/schemas/Error",
          "resolved": true,
          "file": "cafe.yaml",
          "pointer": "#/components/schemas/Error",
          "start_line": 988,
          "end_line": 1024
        }
      ]
    },
    {
      "id": "responses/Unauthorized",
      "pointer": "#/components/responses/Unauthorized",
      "file": "cafe.yaml",
      "start_line": 1339,
      "end_line": 1343,
      "content": "…",
      "refs": [
        {
          "ref": "#/components/schemas/Error",
          "resolved": true,
          "file": "cafe.yaml",
          "pointer": "#/components/schemas/Error",
          "start_line": 988,
          "end_line": 1024
        }
      ]
    },
    {
      "id": "schemas/Order",
      "pointer": "#/components/schemas/Order",
      "file": "cafe.yaml",
      "start_line": 1033,
      "end_line": 1107,
      "content": "…",
      "refs": [
        {
          "ref": "#/components/schemas/OrderStatus",
          "resolved": true,
          "file": "cafe.yaml",
          "pointer": "#/components/schemas/OrderStatus",
          "start_line": 1025,
          "end_line": 1032
        }
      ]
    },
    {
      "id": "schemas/Error",
      "pointer": "#/components/schemas/Error",
      "file": "cafe.yaml",
      "start_line": 988,
      "end_line": 1024,
      "content": "…",
      "refs": []
    },
    {
      "id": "schemas/OrderStatus",
      "pointer": "#/components/schemas/OrderStatus",
      "file": "cafe.yaml",
      "start_line": 1025,
      "end_line": 1032,
      "content": "…",
      "refs": []
    }
  ]
}
```

The `content` values above are elided (`…`); the real output carries the actual raw source lines for the operation and for every dependency.
`--with-deps` also works on a component selection (`--component` + `--name`), and is mutually exclusive with `--used-by`.

`--format=stylish` (the default) doesn't render `--with-deps` at all — a card looks the same with or without it:

```bash
redocly tree cafe.yaml --path=/orders --operation=post --with-deps
```

```
POST /orders (createOrder)
file: cafe.yaml#/paths/~1orders/post
lines: 316..372
summary: Create order
refs:
  - responses/BadRequest  #/components/responses/BadRequest  1327..1331
  - responses/Forbidden  #/components/responses/Forbidden  1345..1349
  - responses/InternalServerError  #/components/responses/InternalServerError  1333..1337
  - responses/Unauthorized  #/components/responses/Unauthorized  1339..1343
  - schemas/Order  #/components/schemas/Order  1033..1107
usedBy: (none)
```

That's the same output as `redocly tree cafe.yaml --path=/orders --operation=post` without `--with-deps`.
Use `--format=json` to actually retrieve the source and the dependency closure.

### Find what depends on a selection: `--used-by`

`--used-by` runs the transitive reverse analysis: every operation and component that depends on the selection, directly or through other components, each with a `via` chain showing the shortest path back to the target.
`--format=json` is the machine report:

```bash
redocly tree cafe.yaml --component=schemas --name=Order --used-by --format=json
```

```json
{
  "target": {
    "id": "schemas/Order",
    "component": "schemas",
    "name": "Order",
    "pointer": "#/components/schemas/Order",
    "file": "cafe.yaml",
    "start_line": 1033,
    "end_line": 1107
  },
  "affectedOperations": [
    {
      "id": "GET /orders",
      "method": "get",
      "path": "/orders",
      "operationId": "listOrders",
      "pointer": "#/paths/~1orders/get",
      "file": "cafe.yaml",
      "start_line": 229,
      "end_line": 314,
      "via": ["schemas/Order", "schemas/OrderList", "GET /orders"]
    },
    {
      "id": "GET /orders/{orderId}",
      "method": "get",
      "path": "/orders/{orderId}",
      "operationId": "getOrderById",
      "pointer": "#/paths/~1orders~1{orderId}/get",
      "file": "cafe.yaml",
      "start_line": 375,
      "end_line": 416,
      "via": ["schemas/Order", "GET /orders/{orderId}"]
    },
    {
      "id": "PATCH /orders/{orderId}",
      "method": "patch",
      "path": "/orders/{orderId}",
      "operationId": "updateOrder",
      "pointer": "#/paths/~1orders~1{orderId}/patch",
      "file": "cafe.yaml",
      "start_line": 418,
      "end_line": 476,
      "via": ["schemas/Order", "PATCH /orders/{orderId}"]
    },
    {
      "id": "POST /orders",
      "method": "post",
      "path": "/orders",
      "operationId": "createOrder",
      "pointer": "#/paths/~1orders/post",
      "file": "cafe.yaml",
      "start_line": 316,
      "end_line": 372,
      "via": ["schemas/Order", "POST /orders"]
    }
  ],
  "affectedComponents": [
    {
      "id": "schemas/OrderList",
      "component": "schemas",
      "name": "OrderList",
      "pointer": "#/components/schemas/OrderList",
      "file": "cafe.yaml",
      "start_line": 1108,
      "end_line": 1124,
      "via": ["schemas/Order", "schemas/OrderList"]
    }
  ]
}
```

`--format=stylish` (the default) renders the same reverse analysis as a tree of only the affected branches, ending with a summary line:

```bash
redocly tree cafe.yaml --component=schemas --name=Order --used-by
```

```treeview
cafe.yaml
├── /orders
│   ├── GET
│   │   └── schemas/OrderList
│   │       └── schemas/Order
│   └── POST
│       └── schemas/Order
└── /orders/{orderId}
    ├── GET
    │   └── schemas/Order
    └── PATCH
        └── schemas/Order

4 of 12 operations affected
```

`--used-by` needs a single operation or component to run the analysis from.
On a `--component` selection, that means adding `--name`:

```
Add --name to use --used-by or --with-deps with --component.
```

On a `--path` or `--webhook` selection, that means adding `--operation`:

```
--used-by requires --operation, or --component with --name.
```

`--used-by` and `--with-deps` answer different questions — what a selection depends on, versus what depends on it — so they're mutually exclusive:

```bash
redocly tree cafe.yaml --component=schemas --name=Order --used-by --with-deps
```

```
Arguments used-by and with-deps are mutually exclusive
```

### Selector errors

An unknown tag, path, webhook, operationId, or component name exits with code `1` and lists close matches, so a typo is easy to spot and fix:

```bash
redocly tree cafe.yaml --tag=Order
```

```
No tag "Order". Did you mean: Orders? Run `redocly tree <api>` to list tags.
```

Path, webhook, and operationId lookups report the same way:

```
No path "/order". Did you mean: /order-items, /orders, /orders/{orderId}? Run `redocly tree <api> --paths` to list paths.
No operation "createOrde". Did you mean: createOrder? Run `redocly tree <api> --operations` to list operations.
No webhook "order-notificatio". Did you mean: order-notification?
```

Selector combinations that don't make sense are rejected before the description is even analyzed, for example a tag and a component section together:

```bash
redocly tree cafe.yaml --tag=Orders --component=schemas
```

```
Arguments component and tag are mutually exclusive
```

The full set of rules: `--tag` excludes `--path`, `--webhook`, `--component`, and `--operation` alone; `--path` and `--webhook` exclude each other and `--tag`; `--component` excludes `--tag`, `--path`, `--webhook`, and `--operation`; `--paths`, `--operations`, and `--files` each exclude every selector, listing, and modifier; `--used-by` excludes `--with-deps`.

Selectors, listings, and `--used-by`/`--with-deps` are OpenAPI-only:

```bash
redocly tree async.yaml --tag=foo
```

```
The tree selectors (--tag, --path, --operation, --webhook, --component, --name, --paths, --operations, --used-by, --with-deps) support OpenAPI descriptions only for now.
```

The default view and `--files` still work on AsyncAPI and Arazzo descriptions — see [Markers legend](#markers-legend) below.

### Unresolvable $refs

An unresolvable `$ref` doesn't fail the command: it's shown as unresolved, and a warning goes to stderr — one line per unresolved reference, exit code stays `0`.

{% tabs %}
{% tab label="API description" %}

```yaml
# openapi.yaml
openapi: 3.2.0
info:
  title: Test API
  version: 1.0.0
paths:
  /items:
    get:
      operationId: listItems
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: './schemas/Item.yaml'
        '500':
          description: Error
          content:
            application/json:
              schema:
                $ref: 'https://example.com/error.yaml'
```

{% /tab  %}
{% tab label="Output" %}

```bash
redocly tree openapi.yaml
```

```
Could not resolve https://example.com/error.yaml — shown as unresolved (❌).
Could not resolve schemas/Item.yaml — shown as unresolved (❌).
Test API  (oas3_2)
Operations: 1 across 1 tags
  untagged (1)
Webhooks: 0
```

{% /tab  %}
{% /tabs  %}

The bounded overview doesn't render a per-node tree, so it has nowhere to put a ❌ marker — the stderr warning is the only signal there.
A card shows the same unresolved refs as data, keeping the declaration site's coordinates and no target location:

```bash
redocly tree openapi.yaml --path=/items --operation=get --format=json
```

```json
{
  "method": "get",
  "path": "/items",
  "operationId": "listItems",
  "tags": [],
  "pointer": "#/paths/~1items/get",
  "file": "openapi.yaml",
  "start_line": 8,
  "end_line": 21,
  "refs": [
    { "ref": "./schemas/Item.yaml", "resolved": false, "component": "unknown" },
    { "ref": "https://example.com/error.yaml", "resolved": false, "component": "unknown" }
  ],
  "usedBy": []
}
```

Both examples print the same two stderr warnings first, then exit `0` — a stale or broken `$ref` never fails a `tree` run.

### Markers legend

The overview, listings, and cards above never draw a nested tree, so they have no glyphs to show — unresolved refs surface as data (`"resolved": false`) or as the stderr warning above.
The file-level graph (`--files`), the `--used-by` stylish tree, and the default view for AsyncAPI/Arazzo descriptions still render as a nested tree, and use the same three markers:

- `🔁` — a cycle: the node references one of its ancestors. It is marked and not expanded further, so traversal terminates. A node that simply appears in more than one place (fan-in, without forming a cycle) is shown without a marker and expanded under each parent.
- `❌` — an unresolvable `$ref`.
- `🔗` — a reference to a URL.

{% tabs %}
{% tab label="API description" %}

```yaml
# openapi.yaml — has a missing-file ref and an unreachable URL ref
openapi: 3.2.0
info:
  title: Cafe
  version: 1.0.0
paths:
  /orders:
    get:
      responses:
        '200':
          description: An order.
          content:
            application/json:
              schema:
                $ref: './schemas/Order.yaml'
        '500':
          description: Shared remote error.
          content:
            application/json:
              schema:
                $ref: 'https://example.com/schemas/Error.yaml'
```

{% /tab  %}
{% tab label="Output" %}

```bash
redocly tree openapi.yaml --files
```

```treeview
openapi.yaml
├── https://example.com/schemas/Error.yaml 🔗 ❌
└── schemas/Order.yaml ❌
```

`--files` mode doesn't print the stderr warning the default view does; the ❌ marker in the tree is the only signal.

{% /tab  %}
{% /tabs  %}

A schema split across two files that reference each other produces the `🔁` marker the same way a single-file recursive schema used to:

```bash
redocly tree openapi.yaml --files
```

```treeview
openapi.yaml
└── schemas/A.yaml
    └── schemas/B.yaml
        └── schemas/A.yaml 🔁
```

`A.yaml` and `B.yaml` reference each other, so the second visit to `A.yaml` is marked `🔁` and not expanded again.

### File-level graph: `--files`

`--files` shows how a description is split across files instead of its paths, operations, and components; a single bundled file has no file-level `$ref`s, so its `--files` graph is just the root.
It doesn't accept the typed selectors, `--paths`/`--operations`, `--used-by`, or `--with-deps` — only `--format` and `--output` apply.

The example below runs against a multi-file version of the same API (a directory produced by [split](./split.md)).

```bash
redocly tree cafe-split/cafe.yaml --files
```

```treeview
cafe.yaml
├── paths/menu-item-images_{menuItemId}.yaml
│   ├── components/parameters/MenuItemId.yaml
│   ├── components/parameters/PhotoSize.yaml
│   ├── components/responses/InternalServerError.yaml
│   │   └── components/schemas/Error.yaml
│   └── components/responses/NotFound.yaml
│       └── components/schemas/Error.yaml
├── paths/menu.yaml
│   ├── components/parameters/After.yaml
│   ├── components/parameters/Before.yaml
│   ├── components/parameters/Filter.yaml
│   ├── components/parameters/Limit.yaml
│   ├── components/parameters/Search.yaml
│   ├── components/parameters/Sort.yaml
│   ├── components/responses/BadRequest.yaml
│   │   └── components/schemas/Error.yaml
│   ├── components/responses/Conflict.yaml
│   │   └── components/schemas/Error.yaml
│   ├── components/responses/Forbidden.yaml
│   │   └── components/schemas/Error.yaml
│   ├── components/responses/InternalServerError.yaml
│   │   └── components/schemas/Error.yaml
│   ├── components/responses/Unauthorized.yaml
│   │   └── components/schemas/Error.yaml
│   ├── components/schemas/MenuItem.yaml
│   │   ├── components/schemas/Beverage.yaml
│   │   │   └── components/schemas/MenuBaseItem.yaml
│   │   └── components/schemas/Dessert.yaml
│   │       └── components/schemas/MenuBaseItem.yaml
│   └── components/schemas/MenuItemList.yaml
│       ├── components/schemas/MenuItem.yaml
│       │   ├── components/schemas/Beverage.yaml
│       │   │   └── components/schemas/MenuBaseItem.yaml
│       │   └── components/schemas/Dessert.yaml
│       │       └── components/schemas/MenuBaseItem.yaml
│       └── components/schemas/Page.yaml
└── … (other files)
```

The tree above is truncated for readability (`… (other files)`); the full output lists all eight path files and the webhook file, including the fan-in on `components/schemas/Error.yaml` (reused by five different response files under `menu.yaml` alone) and `components/schemas/MenuItem.yaml`, which repeats under both `menu.yaml` and `order-items.yaml`.

`--files --format=json` reports the same graph as `nodes`/`links`, which is small enough to show in full for a two-file cycle:

```bash
redocly tree openapi.yaml --files --format=json
```

```json
{
  "nodes": [
    { "id": "openapi.yaml", "resolved": true, "root": true },
    { "id": "schemas/A.yaml", "resolved": true },
    { "id": "schemas/B.yaml", "resolved": true }
  ],
  "links": [
    { "source": "openapi.yaml", "target": "schemas/A.yaml", "refs": ["./schemas/A.yaml"] },
    { "source": "schemas/A.yaml", "target": "schemas/B.yaml", "refs": ["./B.yaml"] },
    { "source": "schemas/B.yaml", "target": "schemas/A.yaml", "refs": ["./A.yaml"] }
  ]
}
```

JSON has no `🔁` marker: the cycle is just a normal link back to a node already listed, since JSON has no traversal to terminate.
Paths are shown relative to the directory of the root description, and `--files` also accepts multiple APIs in one run, merging their graphs.

Component addressing by `--component`/`--name` needs the root document to declare the component (see [Component sections and one component](#component-sections-and-one-component) above); `--files` is what still works on a fully split layout that has no such registry.

### Write the output to a file: `--output`

Use `--output` (`-o`) to write any format to a file instead of `stdout`:

```bash
redocly tree cafe.yaml --format=json --output cafe-index.json
```

```
Tree written to cafe-index.json
```

## The agent index

Large API descriptions do not fit in an LLM's context window.
Instead of feeding the whole file to a model, let the agent navigate the selector surface above in bounded steps.
Every result is generated deterministically from the document structure — no AI calls or API keys are needed.
It is available for OpenAPI descriptions; the typed selectors, `--used-by`, and `--with-deps` report an error for other specification types.
For a measured comparison of how much context this saves — on GitHub's 9.8 MB REST API description, where the whole file is 1.9 million tokens — see [Agent context savings with tree](../guides/tree-agent-index-benchmark.md).

1. Get the map: `redocly tree openapi.yaml --format=json` prints the tags, webhooks, and component sections with their counts — a few kilobytes for any spec size.
2. Drill into a branch the agent picked: `redocly tree openapi.yaml --tag=Tickets` returns that tag's operations with summaries, files, and line ranges.
3. Fetch a leaf with everything it needs: `redocly tree openapi.yaml --path=/orders --operation=post --with-deps --format=json` returns the operation's raw source lines, its resolved `$ref`s, and the transitive dependency closure as `deps` — a self-contained slice for generating a client call, writing a contract test, or reviewing the endpoint.

Every operation and component entry carries the file that defines it, its `start_line`/`end_line` range, and a `summary` taken from the description itself, so an agent can also read the exact lines directly with plain file tools instead of calling the CLI again:

```json
{
  "method": "post",
  "path": "/orders",
  "operationId": "createOrder",
  "summary": "Create order",
  "tags": ["Orders"],
  "pointer": "#/paths/~1orders/post",
  "file": "cafe.yaml",
  "start_line": 316,
  "end_line": 372
}
```

An operation's identity is always its method plus its path or webhook name; a component's identity is always its section plus its name — the same coordinates in every listing, card, and `--used-by` report.
