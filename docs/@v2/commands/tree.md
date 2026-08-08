# `tree`

## Introduction

The `tree` command explores the structure of an API description: an overview of its tags, paths, operations, webhooks, and components, plus typed selectors to drill into exactly one of them.
Every result is attributed to the file that defines it, so a multi-file API shows which file each operation or component lives in.

Use `tree` to:

- Get quick orientation in any API, whether single-file or multi-file: an overview first, then drill into one tag, path, webhook, operation, component, or file.
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
redocly tree <api> --file=<path> [--used-by]
redocly tree <api> --path=<path> --operation=<method> [--with-deps]
redocly tree <api> --component=<section> --name=<name> [--used-by | --with-deps]
redocly tree <api> --paths
redocly tree <api> --operations
redocly tree <api> --webhooks
redocly tree <api> [--format=stylish|json] [--output=<file>] [--config=<path>]
redocly tree --files [apis...] [--file=<path>]
```

With no API argument, the command takes the API from the Redocly configuration file.
The default view shows one API's overview at a time; pass a single API, or use `--files` for the multi-API file graph.

## Options

| Option        | Type     | Description                                                                                                                                                                                                                                               |
| ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| apis          | [string] | In the default view, one API description file or alias. In `--files` mode, one or more files or aliases. Defaults to the APIs from the Redocly configuration file.                                                                                        |
| --tag         | string   | Show the operations of one tag.                                                                                                                                                                                                                           |
| --path        | string   | Show the operations of one path. Combine with `--operation` to select a single operation on that path.                                                                                                                                                    |
| --webhook     | string   | Show the operations of one webhook. Combine with `--operation` to select a single webhook operation.                                                                                                                                                      |
| --operation   | string   | Show one operation: an HTTP method (with `--path` or `--webhook`) or an operationId on its own. A value that looks like an HTTP method without `--path`/`--webhook` is rejected with a hint to add one.                                                   |
| --component   | string   | Show a component section (`schemas`, `responses`, `parameters`, `requestBodies`, `headers`, `securitySchemes`, `examples`, `links`, `callbacks`) or, with `--name`, one component.                                                                        |
| --name        | string   | Component name; requires `--component`.                                                                                                                                                                                                                   |
| --file        | string   | Show everything one file defines. Combine with `--used-by` for that file's impact analysis, or with `--files` to filter the file graph to that file's neighborhood.                                                                                       |
| --paths       | boolean  | List every path with its methods.                                                                                                                                                                                                                         |
| --operations  | boolean  | List every operation. Webhooks aren't included; select them with `--webhook` or list them all with `--webhooks`.                                                                                                                                          |
| --webhooks    | boolean  | List every webhook operation, the same way `--operations` lists every non-webhook operation.                                                                                                                                                              |
| --used-by     | boolean  | With an operation, a component (`--component` + `--name`), or a file (`--file`) selection, show every operation and component that transitively depends on it.                                                                                            |
| --with-deps   | boolean  | With an operation or a component (`--component` + `--name`) selection, add its raw source lines and the transitive `$ref` closure, capped at 64 KB with a `truncated` marker.                                                                             |
| --brief       | boolean  | Print JSON listing entries as `{ method, path, summary, lines }` instead of the full card, with no `refs` or `usedBy`. No effect with `--format=stylish`. Mutually exclusive with `--used-by` and `--with-deps`.                                          |
| --compact     | boolean  | Serialize `--format=json` output without indentation, for any view. Combines with `--brief`.                                                                                                                                                              |
| --files       | boolean  | Show the file-level `$ref` graph instead of the API structure. Doesn't accept the typed selectors, `--paths`, `--operations`, `--webhooks`, `--used-by`, or `--with-deps` — `--file` is the exception, and filters the graph to that file's neighborhood. |
| --format      | string   | Output format: `stylish` (default, human-readable) or `json` (machine-readable, the same selection as data).                                                                                                                                              |
| --output, -o  | string   | Write the output to a file instead of `stdout`.                                                                                                                                                                                                           |
| --config      | string   | Specify the path to the [Redocly configuration file](../configuration/index.md).                                                                                                                                                                          |
| --lint-config | string   | Specify the severity level for the configuration file. **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                                                                                              |
| --help        | boolean  | Display help.                                                                                                                                                                                                                                             |
| --version     | boolean  | Display version number.                                                                                                                                                                                                                                   |

Selectors combine only in the shapes shown under _Usage_ above; other combinations are a usage error.
For example, `--tag` and `--component` each select a different, unrelated scope, so combining them fails fast:

```
Arguments component and tag are mutually exclusive
```

See [Selector errors](#selector-errors) for the full set of these checks.

## Examples

### Get an overview of an API description

With no selector, `tree` prints a bounded overview as a tree: the document name and info summary at the root, then branches for servers, tags with their operations, webhook names with their operations, and component sections with their counts.
Past 100 operations the tree collapses to tag counts and points at `--tag` instead — a 1,216-operation description renders as 50 readable lines, not 1,270.

```bash
redocly tree cafe.yaml
```

```
cafe.yaml — Redocly Cafe — Demo API for cafe operators (not customers) to manage menus, orders, and revenue. Create API credentials and try it yourself in a realistic…  (oas3_2)
├── Servers
│   └── https://api.cafe.redocly.com
├── Operations (12)
│   ├── Authorization (1) — Create a client to demo the API.
│   │   └── POST /oauth2/register — Create OAuth2 client (registerOAuth2Client)  [604..661]
│   ├── Products (4) — Operations related to products.
│   │   ├── GET /menu — List all menu items (listMenuItems)  [32..111]
│   │   ├── POST /menu — Create menu item (createMenuItem)  [113..173]
│   │   ├── DELETE /menu/{menuItemId} — Delete a menu item (deleteMenuItem)  [178..198]
│   │   └── GET /menu-item-images/{menuItemId} — Retrieve a menu item photo (getMenuItemPhoto)  [203..226]
│   ├── Orders (6) — Order management operations.
│   │   ├── GET /orders — List all orders (listOrders)  [229..314]
│   │   ├── POST /orders — Create order (createOrder)  [316..372]
│   │   ├── GET /orders/{orderId} — Retrieve an order (getOrderById)  [375..416]
│   │   ├── DELETE /orders/{orderId} — Delete an order (deleteOrder)  [478..502]
│   │   ├── PATCH /orders/{orderId} — Partially update an order (updateOrder)  [418..476]
│   │   └── GET /order-items — List all order items with menu item details (listOrderItems)  [505..546]
│   └── Statistics (1) — Statistics operations.
│       └── GET /revenue — Get revenue statistics (getRevenue)  [549..601]
├── Webhooks (1)
│   └── order-notification
│       └── POST — Order notification webhook (orderNotificationWebhook)  [665..683]
└── Components (32)
    ├── schemas (15)
    ├── responses (6)
    ├── parameters (9)
    └── securitySchemes (2)
```

Each operation line follows `METHOD /path — summary (operationId)  [start..end]`, omitting the summary or operationId when the operation has none; a webhook's operation lines drop the path since the webhook name above them already names it.
An operation with more than one tag appears once under each of its tags.
Each branch is omitted when it's empty — a description with no servers, webhooks, or components skips those lines entirely.

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
  "operations": 12,
  "webhooks": [{ "name": "order-notification", "operations": 1 }],
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
/orders (2)
├── GET "List all orders" 229..314 [Orders]
└── POST "Create order" 316..372 [Orders]

/orders/{orderId} (3)
├── GET "Retrieve an order" 375..416 [Orders]
├── DELETE "Delete an order" 478..502 [Orders]
└── PATCH "Partially update an order" 418..476 [Orders]

/order-items (1)
└── GET "List all order items with menu item details" 505..546 [Orders]
```

`--format=json` returns the same operations as a flat list, but card-shaped: each entry carries the same coordinates as before, plus a `description`, its typed one-hop `refs`, and one-hop `usedBy` — the same shape as the single operation card shown under [Get one operation](#get-one-operation) below, just one per operation instead of one per selection.
The full response for this tag has six entries; here are the first two:

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
    "end_line": 314,
    "description": "Retrieve a collection of orders with optional filtering and pagination.",
    "refs": [
      {
        "ref": "#/components/parameters/After",
        "resolved": true,
        "file": "cafe.yaml",
        "pointer": "#/components/parameters/After",
        "start_line": 714,
        "end_line": 721,
        "component": "parameters",
        "name": "After"
      },
      {
        "ref": "#/components/schemas/OrderList",
        "resolved": true,
        "file": "cafe.yaml",
        "pointer": "#/components/schemas/OrderList",
        "start_line": 1108,
        "end_line": 1124,
        "component": "schemas",
        "name": "OrderList"
      }
    ],
    "usedBy": []
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
]
```

`GET /orders` actually resolves eleven `refs` (six parameters, four responses, one schema) and `POST /orders` resolves five; both lists above are trimmed to two entries each for readability — nothing about the shape changes for the rest.

`--tag` is mutually exclusive with `--path`, `--webhook`, `--component`, `--file`, and `--operation` on its own (an operationId can't disambiguate which tag it belongs to when both are given).

### List the operations of a path

```bash
redocly tree cafe.yaml --path=/orders
```

```
/orders (2)
├── GET "List all orders" 229..314 [Orders]
└── POST "Create order" 316..372 [Orders]
```

The JSON shape is the same card-shaped list of operation entries shown under `--tag` above.
`--path` is mutually exclusive with `--tag`, `--webhook`, and `--file`.

### Get one operation

Add `--operation` with an HTTP method to select a single operation on that path.
`--format=stylish` (the default) renders a card as a pure tree: the operation on the root line, then a `source:` branch with its exact coordinates, one branch per typed edge — `refs` (outgoing, one hop) and `usedBy` (incoming, one hop) — and nothing else; there's no raw source in stylish, only coordinates and edges.

```bash
redocly tree cafe.yaml --path=/orders --operation=post
```

```
POST /orders — Create order (createOrder)
├── source: cafe.yaml#/paths/~1orders/post  [316..372]
├── refs (5)
│   ├── responses/BadRequest → cafe.yaml#/components/responses/BadRequest  [1327..1331]
│   ├── responses/Forbidden → cafe.yaml#/components/responses/Forbidden  [1345..1349]
│   ├── responses/InternalServerError → cafe.yaml#/components/responses/InternalServerError  [1333..1337]
│   ├── responses/Unauthorized → cafe.yaml#/components/responses/Unauthorized  [1339..1343]
│   └── schemas/Order → cafe.yaml#/components/schemas/Order  [1033..1107]
└── usedBy (none)
```

Each `refs` entry is `component/name → file#pointer  [start..end]`; an unresolved ref shows `<raw ref> (unresolved)`, and a resolved ref to something that isn't a named component (a path-item file, a code sample) shows `<raw ref> → file  [start..end]`.
`usedBy` follows the same arrow shape, keyed by the referrer's id, and renders as a `usedBy (none)` leaf when nothing references the selection — the usual case for an operation.

`--format=json` returns the same coordinates and edges as data, plus a `description`:

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

`--webhook` lists a webhook's operations the same way `--path` lists a path's (and, like `--path`, in the same card-shaped JSON):

```bash
redocly tree cafe.yaml --webhook=order-notification
```

```
order-notification (1)
└── POST "Order notification webhook" 665..683 [Orders]
```

To list every webhook across the whole description at once — the plural flag, not a specific name — see [List every path, operation, or webhook](#list-every-path-operation-or-webhook) below.

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

`--webhook` is mutually exclusive with `--tag`, `--path`, `--file`, and `--webhooks`.

### Component sections and one component

`--component` lists every component in a section: name, pointer location, lines, and a one-line description when the component has one.
In JSON, each entry is card-shaped, with typed `refs` and one-hop `usedBy` added the same way as the operation listings above.

```bash
redocly tree cafe.yaml --component=schemas
```

```
schemas (15)
├── Page 823..867
├── MenuBaseItem 868..923
├── Beverage 924..943
├── Dessert 944..959
├── MenuItem 960..970
├── MenuItemList 971..987
├── Error 988..1024
├── OrderStatus "Order status." 1025..1032
├── Order 1033..1107
├── OrderList 1108..1124
├── OrderItem 1125..1152
├── RevenueStatistics "Revenue statistics for a given date range." 1153..1206
├── RegisterClientObject 1207..1239
├── OAuth2Client "OAuth2 client registration response. Per RFC 7591, includes the client identifier, secret, timestamps, and all registered client metadata." 1240..1309
└── OrderNotification 1310..1324
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
├── source: cafe.yaml#/components/schemas/Order  [1033..1107]
├── refs (1)
│   └── schemas/OrderStatus → cafe.yaml#/components/schemas/OrderStatus  [1025..1032]
└── usedBy (4)
    ├── GET /orders/{orderId} → cafe.yaml  [375..416]
    ├── PATCH /orders/{orderId} → cafe.yaml  [418..476]
    ├── POST /orders → cafe.yaml  [316..372]
    └── schemas/OrderList → cafe.yaml  [1108..1124]
```

`usedBy` here shows every operation and component with a direct reference to `Order` — one hop only; for the transitive version see `--used-by` below.
`--component` is mutually exclusive with `--tag`, `--path`, `--webhook`, `--file`, and `--operation`.

Component addressing by `--component`/`--name` requires the root document to declare the component (`components: {schemas: {Order: {$ref: ./Order.yaml}}}` or inline).
A fully split layout with no root registry — where operation files reference component files directly, as [`redocly split`](./split.md) produces — has nothing to list.
The example below runs against a multi-file version of the same API (a directory produced by [split](./split.md)).

```bash
redocly tree cafe-split/cafe.yaml --component=schemas
```

```
schemas (0)
```

Use `--files` to see those components' files instead, or read a card's `refs[].file`/`usedBy[].file`.
A component invisible to `--component` this way still has real `$ref` edges in the graph — see [Everything one file defines](#everything-one-file-defines) below for how `--file --used-by` reaches it anyway.

### Everything one file defines

`--file=<path>` shows every operation and component a single file defines — most useful on a split, multi-file layout, where `--component`/`--name` can't address a component the root document never registers (see the empty listing just above).
The path is resolved the same way as other file arguments elsewhere in the CLI: relative to the API's own directory first, falling back to the current directory.

```bash
redocly tree cafe-split/cafe.yaml --file=paths/orders.yaml
```

```
cafe-split/paths/orders.yaml
├── GET /orders — List all orders (listOrders)  [2..62]
└── POST /orders — Create order (createOrder)  [64..118]
```

`--format=json` wraps the same card-shaped entries used by the listings above in `{ file, defines }`:

```bash
redocly tree cafe-split/cafe.yaml --file=paths/orders.yaml --format=json
```

```json
{
  "file": "cafe-split/paths/orders.yaml",
  "defines": [
    {
      "method": "get",
      "path": "/orders",
      "operationId": "listOrders",
      "summary": "List all orders",
      "tags": ["Orders"],
      "pointer": "#/get",
      "file": "cafe-split/paths/orders.yaml",
      "start_line": 2,
      "end_line": 62,
      "description": "Retrieve a collection of orders with optional filtering and pagination.",
      "refs": [
        {
          "ref": "../components/parameters/After.yaml",
          "resolved": true,
          "file": "cafe-split/components/parameters/After.yaml",
          "pointer": "#/",
          "start_line": 1,
          "end_line": 6,
          "component": "parameters",
          "name": "After"
        },
        {
          "ref": "../components/parameters/Before.yaml",
          "resolved": true,
          "file": "cafe-split/components/parameters/Before.yaml",
          "pointer": "#/",
          "start_line": 1,
          "end_line": 7,
          "component": "parameters",
          "name": "Before"
        }
      ],
      "usedBy": []
    },
    {
      "method": "post",
      "path": "/orders",
      "operationId": "createOrder",
      "summary": "Create order",
      "tags": ["Orders"],
      "pointer": "#/post",
      "file": "cafe-split/paths/orders.yaml",
      "start_line": 64,
      "end_line": 118,
      "description": "Create a new order. Order items cannot be changed - if they need to be updated, cancel the order and place a new one.",
      "refs": [
        {
          "ref": "../components/responses/BadRequest.yaml",
          "resolved": true,
          "file": "cafe-split/components/responses/BadRequest.yaml",
          "pointer": "#/",
          "start_line": 1,
          "end_line": 5,
          "component": "responses",
          "name": "BadRequest"
        },
        {
          "ref": "../components/schemas/Order.yaml",
          "resolved": true,
          "file": "cafe-split/components/schemas/Order.yaml",
          "pointer": "#/",
          "start_line": 1,
          "end_line": 72,
          "component": "schemas",
          "name": "Order"
        }
      ],
      "usedBy": []
    }
  ]
}
```

The `get` entry actually resolves eleven `refs` (six parameters, four responses, one schema); the two shown above are the first two, trimmed the same way as the `--tag` example further up.
Every entry in `defines` is the same list-card shape as `--tag`/`--path`/`--component` above, just scoped to the file instead of a tag, path, or section.
A file with no operations or components of its own — one that only groups others via `$ref`, or the root document itself — still gets a card, with an empty `defines: []`.

Add `--used-by` for that file's impact analysis — every operation and component that transitively depends on anything the file defines, seeded from all of it at once:

```bash
redocly tree cafe-split/cafe.yaml --file=components/schemas/Order.yaml --used-by --format=json
```

```json
{
  "target": {
    "id": "cafe-split/components/schemas/Order.yaml",
    "file": "cafe-split/components/schemas/Order.yaml"
  },
  "affectedOperations": [
    {
      "id": "GET /orders",
      "method": "get",
      "path": "/orders",
      "operationId": "listOrders",
      "pointer": "#/get",
      "file": "cafe-split/paths/orders.yaml",
      "start_line": 2,
      "end_line": 62,
      "via": [
        "cafe-split/components/schemas/Order.yaml",
        "cafe-split/components/schemas/OrderList.yaml",
        "GET /orders"
      ]
    },
    {
      "id": "GET /orders/{orderId}",
      "method": "get",
      "path": "/orders/{orderId}",
      "operationId": "getOrderById",
      "pointer": "#/get",
      "file": "cafe-split/paths/orders_{orderId}.yaml",
      "start_line": 2,
      "end_line": 43,
      "via": ["cafe-split/components/schemas/Order.yaml", "GET /orders/{orderId}"]
    },
    {
      "id": "PATCH /orders/{orderId}",
      "method": "patch",
      "path": "/orders/{orderId}",
      "operationId": "updateOrder",
      "pointer": "#/patch",
      "file": "cafe-split/paths/orders_{orderId}.yaml",
      "start_line": 45,
      "end_line": 100,
      "via": ["cafe-split/components/schemas/Order.yaml", "PATCH /orders/{orderId}"]
    },
    {
      "id": "POST /orders",
      "method": "post",
      "path": "/orders",
      "operationId": "createOrder",
      "pointer": "#/post",
      "file": "cafe-split/paths/orders.yaml",
      "start_line": 64,
      "end_line": 118,
      "via": ["cafe-split/components/schemas/Order.yaml", "POST /orders"]
    }
  ],
  "affectedComponents": []
}
```

This is the same report shape as the plain `--used-by` analysis further below, just seeded from a whole file instead of one operation or component — notice it works here even though `components/schemas/Order.yaml` is the exact file that had nothing to list under plain `--component=schemas` two examples up: `--used-by` walks the real `$ref` graph, which doesn't care whether the root document registers the component under `components:`.

`--file` also combines with `--files` to filter the file-level graph down to one file's neighborhood — see the file-level graph section below.
It's mutually exclusive with every typed selector (`--tag`, `--path`, `--webhook`, `--operation`, `--component`, `--name`) and with `--paths`, `--operations`, `--webhooks`; combining it with `--with-deps` is rejected the same way an incomplete selector is:

```
--with-deps requires an operation or component selection.
```

### List every path, operation, or webhook

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

`--operations` lists every operation the same way `--tag` does, but for the whole description; JSON entries are the same card shape shown under `--tag` above:

```bash
redocly tree cafe.yaml --operations
```

```
/menu (2)
├── GET "List all menu items" 32..111 [Products]
└── POST "Create menu item" 113..173 [Products]

/menu/{menuItemId} (1)
└── DELETE "Delete a menu item" 178..198 [Products]

/menu-item-images/{menuItemId} (1)
└── GET "Retrieve a menu item photo" 203..226 [Products]

/orders (2)
├── GET "List all orders" 229..314 [Orders]
└── POST "Create order" 316..372 [Orders]

/orders/{orderId} (3)
├── GET "Retrieve an order" 375..416 [Orders]
├── DELETE "Delete an order" 478..502 [Orders]
└── PATCH "Partially update an order" 418..476 [Orders]

/order-items (1)
└── GET "List all order items with menu item details" 505..546 [Orders]

/revenue (1)
└── GET "Get revenue statistics" 549..601 [Statistics]

/oauth2/register (1)
└── POST "Create OAuth2 client" 604..661 [Authorization]
```

`--operations` never includes webhooks; `--webhooks` lists those instead, the same way but scoped to every webhook operation across the whole description:

```bash
redocly tree cafe.yaml --webhooks --format=json
```

```json
[
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
]
```

`cafe.yaml` only declares the one webhook shown above; with more than one, `--webhooks` groups them the same way `--operations` groups by path — one tree root per webhook name.
`--paths`, `--operations`, and `--webhooks` are each mutually exclusive with every selector — they're already "give me everything," so a narrower selector alongside them makes no sense.

### Trim JSON listings: `--brief`

Every listing above returns full card-shaped entries in `--format=json`: coordinates, a one-hop `refs` array, and `usedBy`.
An agent picking which branch to open next often doesn't need any of that — `--brief` drops it and prints just `{ method, path, summary, lines }` per entry (`{ name, summary, lines }` for a component listing), adding `file` only once the listing spans more than one file, the same rule the stylish listings use.

```bash
redocly tree cafe.yaml --tag=Orders --brief --format=json
```

```json
[
  {
    "method": "get",
    "path": "/orders",
    "operationId": "listOrders",
    "summary": "List all orders",
    "lines": [229, 314]
  },
  {
    "method": "post",
    "path": "/orders",
    "operationId": "createOrder",
    "summary": "Create order",
    "lines": [316, 372]
  },
  {
    "method": "get",
    "path": "/orders/{orderId}",
    "operationId": "getOrderById",
    "summary": "Retrieve an order",
    "lines": [375, 416]
  },
  {
    "method": "delete",
    "path": "/orders/{orderId}",
    "operationId": "deleteOrder",
    "summary": "Delete an order",
    "lines": [478, 502]
  },
  {
    "method": "patch",
    "path": "/orders/{orderId}",
    "operationId": "updateOrder",
    "summary": "Partially update an order",
    "lines": [418, 476]
  },
  {
    "method": "get",
    "path": "/order-items",
    "operationId": "listOrderItems",
    "summary": "List all order items with menu item details",
    "lines": [505, 546]
  }
]
```

The full card-shaped version of this same tag, shown under [List the operations of a tag](#list-the-operations-of-a-tag) above, was trimmed to its first two entries for space; all six fit here in full.
On GitHub's 10.0 MB REST API description, the equivalent `--tag=repos --format=json` listing costs 129,719 tokens; `--brief` brings it down to 9,227 — a 93% reduction.
`--brief` only reshapes the listing views (`--tag`; `--path`/`--webhook` without `--operation`; `--operations`; `--webhooks`; `--component` without `--name`; a `--file` card's `defines`) — every other view is unaffected, and it's a no-op with `--format=stylish`, which is already this compact.
It's mutually exclusive with `--used-by` and `--with-deps`: both add exactly the detail `--brief` removes.

### Compact JSON output: `--compact`

`--compact` serializes any `--format=json` output without indentation — the overview, a listing, a card, or a `--used-by` report all get the same treatment.

```bash
redocly tree cafe.yaml --format=json --compact
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
  "operations": 12,
  "webhooks": [{ "name": "order-notification", "operations": 1 }],
  "components": [
    { "section": "schemas", "count": 15 },
    { "section": "responses", "count": 6 },
    { "section": "parameters", "count": 9 },
    { "section": "securitySchemes", "count": 2 }
  ]
}
```

This is the same overview shown under [Get an overview of an API description](#get-an-overview-of-an-api-description) above, just without the newlines and indentation: measured across tree's JSON views, `--compact` cuts about 32% of the output.
It combines with `--brief`: `--brief` shrinks each entry and `--compact` removes the whitespace between them, so the two stack.

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

`--format=stylish` (the default) never prints raw source — that stays JSON-only — but it does render the dependency closure as a fourth branch, `deps (N, X KB of 64 KB cap)`, one line per dependency in the same order as the JSON `deps` array:

```bash
redocly tree cafe.yaml --path=/orders --operation=post --with-deps
```

```
POST /orders — Create order (createOrder)
├── source: cafe.yaml#/paths/~1orders/post  [316..372]
├── refs (5)
│   ├── responses/BadRequest → cafe.yaml#/components/responses/BadRequest  [1327..1331]
│   ├── responses/Forbidden → cafe.yaml#/components/responses/Forbidden  [1345..1349]
│   ├── responses/InternalServerError → cafe.yaml#/components/responses/InternalServerError  [1333..1337]
│   ├── responses/Unauthorized → cafe.yaml#/components/responses/Unauthorized  [1339..1343]
│   └── schemas/Order → cafe.yaml#/components/schemas/Order  [1033..1107]
├── usedBy (none)
└── deps (7, 4.2 KB of 64 KB cap)
    ├── responses/BadRequest → cafe.yaml  [1327..1331]
    ├── responses/Forbidden → cafe.yaml  [1345..1349]
    ├── responses/InternalServerError → cafe.yaml  [1333..1337]
    ├── responses/Unauthorized → cafe.yaml  [1339..1343]
    ├── schemas/Order → cafe.yaml  [1033..1107]
    ├── schemas/Error → cafe.yaml  [988..1024]
    └── schemas/OrderStatus → cafe.yaml  [1025..1032]
```

Each `deps` entry is `id → file  [start..end]`, the same arrow shape as `refs`, without the pointer (a dependency's own `refs` are one selector away, or in the JSON `deps[].refs`).
When the closure hits the cap, the label gains a ` (truncated)` suffix: `deps (12, 64.0 KB of 64 KB cap) (truncated)`.
Each dependency's own raw source is available the same way, one selector at a time, or in full through `--format=json`.

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

The full set of rules: `--tag` excludes `--path`, `--webhook`, `--component`, `--file`, and `--operation` alone; `--path` and `--webhook` exclude each other, `--tag`, and `--file`; `--component` excludes `--tag`, `--path`, `--webhook`, `--file`, and `--operation`; `--file` excludes every typed selector (`--tag`, `--path`, `--webhook`, `--operation`, `--component`, `--name`) and the `--paths`/`--operations`/`--webhooks` listings, but combines with `--used-by`, and with `--files` to filter the file graph; `--webhooks` excludes every typed selector and the `--paths`/`--operations` listings; `--paths` and `--operations` each exclude every selector, listing, and modifier; `--files` excludes every selector, listing, and modifier except `--file`; `--used-by` excludes `--with-deps`.

Selectors, listings, and `--used-by`/`--with-deps` are OpenAPI-only:

```bash
redocly tree async.yaml --tag=foo
```

```
The tree selectors (--tag, --path, --operation, --webhook, --component, --name, --file, --paths, --operations, --webhooks, --used-by, --with-deps) support OpenAPI descriptions only for now.
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
openapi.yaml — Test API  (oas3_2)
└── Operations (1)
    └── untagged (1)
        └── GET /items (listItems)  [8..21]
```

{% /tab  %}
{% /tabs  %}

The overview's operation line has no ❌ marker of its own — it's the stderr warning above that flags the unresolved ref, and the card (`--path`/`--operation`) below shows exactly which one.
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

The overview, listings, and cards above render their own tree glyphs, but they're not a walked `$ref` graph, so they never carry these three markers — an unresolved ref surfaces there as data (`"resolved": false`) or as the stderr warning above, never as a marker on a branch.
The file-level graph (`--files`), the `--used-by` stylish tree, and the default view for AsyncAPI/Arazzo descriptions do walk a `$ref` graph, and use these three markers on it:

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
It doesn't accept the typed selectors, `--paths`/`--operations`/`--webhooks`, `--used-by`, or `--with-deps` — `--file` is the one exception, and filters the graph instead of selecting from it (see below).

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

Add `--file=<path>` to filter the graph down to one file's neighborhood — every file it references, directly or transitively, plus every file that references it back:

```bash
redocly tree cafe-split/cafe.yaml --files --file=components/schemas/Order.yaml
```

```treeview
cafe.yaml
├── paths/orders.yaml
│   ├── components/schemas/Order.yaml
│   │   └── components/schemas/OrderStatus.yaml
│   └── components/schemas/OrderList.yaml
│       └── components/schemas/Order.yaml
│           └── components/schemas/OrderStatus.yaml
└── paths/orders_{orderId}.yaml
    ├── components/schemas/Order.yaml
    │   └── components/schemas/OrderStatus.yaml
    └── components/schemas/OrderStatus.yaml
```

This excludes every file outside `components/schemas/Order.yaml`'s neighborhood — `paths/menu.yaml`, the other component files, and the rest of the full graph shown earlier — leaving only the files that lead to it or that it leads to.
For the card-shaped view of what one file itself defines, or that file's own impact analysis, see [Everything one file defines](#everything-one-file-defines) above.

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
For a measured comparison of how much context this saves — on GitHub's 10.0 MB REST API description, where the whole file is 1.9 million tokens — see [Agent context savings with tree](../guides/tree-agent-index-benchmark.md).

1. Get the map: `redocly tree openapi.yaml --format=json` prints the tags, webhook names, and component sections with their counts — a few kilobytes for any spec size.
2. Drill into a branch the agent picked: `redocly tree openapi.yaml --tag=Tickets` returns that tag's operations with summaries, files, and line ranges — each already carrying its own one-hop `refs` and `usedBy`, so the agent often has enough to decide the next step without a second call.
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
