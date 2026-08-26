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
redocly tree <api> --find=<terms>
redocly tree <api> --pointer=<pointer> [--used-by | --with-deps]
redocly tree <api> --path=<path> --operation=<method> [--with-deps]
redocly tree <api> --component=<section> --name=<name> [--used-by | --with-deps]
redocly tree <api> --operations
redocly tree <api> --webhooks
redocly tree <api> [--format=stylish|json|ai] [--output=<file>] [--config=<path>]
redocly tree --files [apis...] [--file=<path>]
```

With no API argument, the command takes the API from the Redocly configuration file.
The default view shows one API's overview at a time; pass a single API, or use `--files` for the multi-API file graph.

## Options

| Option        | Type     | Description                                                                                                                                                                                                                                                                                                                                      |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| apis          | [string] | In the default view, one API description file or alias. In `--files` mode, one or more files or aliases. Defaults to the APIs from the Redocly configuration file.                                                                                                                                                                               |
| --tag         | string   | Show the operations of one tag, or list every tag when no name is given.                                                                                                                                                                                                                                                                         |
| --path        | string   | Show the operations of one path. Combine with `--operation` to select a single operation on that path.                                                                                                                                                                                                                                           |
| --webhook     | string   | Show the operations of one webhook. Combine with `--operation` to select a single webhook operation.                                                                                                                                                                                                                                             |
| --operation   | string   | Show one operation: an HTTP method (with `--path` or `--webhook`) or an operationId on its own. A value that looks like an HTTP method without `--path`/`--webhook` is rejected with a hint to add one.                                                                                                                                          |
| --component   | string   | Show a component section (`schemas`, `responses`, `parameters`, `requestBodies`, `headers`, `securitySchemes`, `examples`, `links`, `callbacks`) or, with `--name`, one component.                                                                                                                                                               |
| --name        | string   | Component name; requires `--component`.                                                                                                                                                                                                                                                                                                          |
| --file        | string   | Show everything one file defines. Combine with `--used-by` for that file's impact analysis, or with `--files` to filter the file graph to that file's neighborhood.                                                                                                                                                                              |
| --find        | string   | Search operations and components by words in their path, id, name, summary, description, or tags. Standalone; not combinable with other selectors.                                                                                                                                                                                               |
| --pointer     | string   | Navigate by a raw JSON pointer from a `$ref` or lint output; shows the node's location and usage. Standalone; combines only with --used-by/--with-deps on indexed nodes.                                                                                                                                                                         |
| --operations  | boolean  | List every operation. Webhooks aren't included; select them with `--webhook` or list them all with `--webhooks`.                                                                                                                                                                                                                                 |
| --webhooks    | boolean  | List every webhook operation, the same way `--operations` lists every non-webhook operation.                                                                                                                                                                                                                                                     |
| --used-by     | boolean  | With an operation, a component (`--component` + `--name`), or a file (`--file`) selection, show every operation and component that transitively depends on it.                                                                                                                                                                                   |
| --with-deps   | boolean  | With an operation or a component (`--component` + `--name`) selection, add its raw source lines and the transitive `$ref` closure, capped at 64 KB with a `truncated` marker.                                                                                                                                                                    |
| --files       | boolean  | Show the file-level `$ref` graph instead of the API structure. Doesn't accept the typed selectors, `--operations`, `--webhooks`, `--used-by`, or `--with-deps` — `--file` is the exception, and filters the graph to that file's neighborhood.                                                                                                   |
| --format      | string   | Output format: `stylish` (default, human-readable), `json` (machine-readable, pretty-printed), or `ai` — a plain-text format for agents: one line per listing entry with `L<start>` coordinates, an operation or component card's body as one line of minified JSON, and a `--with-deps` closure emitting schema signatures instead of raw YAML. |
| --output, -o  | string   | Write the output to a file instead of `stdout`.                                                                                                                                                                                                                                                                                                  |
| --config      | string   | Specify the path to the [Redocly configuration file](../configuration/index.md).                                                                                                                                                                                                                                                                 |
| --lint-config | string   | Specify the severity level for the configuration file. **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                                                                                                                                                                                     |
| --help        | boolean  | Display help.                                                                                                                                                                                                                                                                                                                                    |
| --version     | boolean  | Display version number.                                                                                                                                                                                                                                                                                                                          |

Selectors combine only in the shapes shown under _Usage_ above; other combinations are a usage error.
For example, `--tag` and `--component` each select a different, unrelated scope, so combining them fails fast:

```text
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

```text
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
    {
      "name": "Authorization",
      "summary": "Create a client to demo the API.",
      "operations": 1
    },
    {
      "name": "Products",
      "summary": "Operations related to products.",
      "operations": 4
    },
    {
      "name": "Orders",
      "summary": "Order management operations.",
      "operations": 6
    },
    {
      "name": "Statistics",
      "summary": "Statistics operations.",
      "operations": 1
    }
  ],
  "operations": 12,
  "webhooks": [
    {
      "name": "order-notification",
      "operations": 1
    }
  ],
  "components": [
    {
      "section": "schemas",
      "count": 15
    },
    {
      "section": "responses",
      "count": 6
    },
    {
      "section": "parameters",
      "count": 9
    },
    {
      "section": "securitySchemes",
      "count": 2
    }
  ]
}
```

### List the tags

A bare `--tag` lists every tag with its operation count, for when the tag names are not known yet:

```bash
redocly tree cafe.yaml --tag
```

```text
Tags (4)
├── Authorization (1) — Create a client to demo the API.
├── Products (4) — Operations related to products.
├── Orders (6) — Order management operations.
└── Statistics (1) — Statistics operations.

Use --tag=<name> for a tag’s operations.
```

With `--format=ai` the same listing is one line per tag, closed by the `next:` line that continues into one of them:

```bash
redocly tree cafe.yaml --tag --format=ai
```

```text
tags · 4 tags
Authorization · 1 operation — Create a client to demo the API.
Products · 4 operations — Operations related to products.
Orders · 6 operations — Order management operations.
Statistics · 1 operation — Statistics operations.
next: --tag=<name>
```

### List the operations of a tag

```bash
redocly tree cafe.yaml --tag=Orders
```

```text
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

`--format=json` returns the same operations as a flat list, but card-shaped: each entry carries the same coordinates as before, plus a `description`, the `security` the operation effectively requires, its typed one-hop `refs`, and one-hop `usedBy` — the same shape as the single operation card shown under [Get one operation](#get-one-operation) below, just one per operation instead of one per selection.
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
    "security": {
      "requirements": [
        {
          "OAuth2": ["orders:read"]
        }
      ],
      "schemes": [
        {
          "name": "OAuth2",
          "type": "oauth2"
        }
      ]
    },
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
        "end_line": 1123,
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
    "security": {
      "requirements": [
        {
          "OAuth2": ["orders:write"]
        }
      ],
      "schemes": [
        {
          "name": "OAuth2",
          "type": "oauth2"
        }
      ]
    },
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
        "end_line": 1106,
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

```text
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

```text
POST /orders — Create order (createOrder)
├── source: cafe.yaml#/paths/~1orders/post  [316..372]
├── refs (5)
│   ├── responses/BadRequest → cafe.yaml#/components/responses/BadRequest  [1327..1331]
│   ├── responses/Forbidden → cafe.yaml#/components/responses/Forbidden  [1345..1349]
│   ├── responses/InternalServerError → cafe.yaml#/components/responses/InternalServerError  [1333..1337]
│   ├── responses/Unauthorized → cafe.yaml#/components/responses/Unauthorized  [1339..1343]
│   └── schemas/Order → cafe.yaml#/components/schemas/Order  [1033..1106]
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
  "security": {
    "requirements": [
      {
        "OAuth2": ["orders:write"]
      }
    ],
    "schemes": [
      {
        "name": "OAuth2",
        "type": "oauth2"
      }
    ]
  },
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
      "end_line": 1106,
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

```text
"post" looks like an HTTP method. Add --path (or --webhook) to select the operation, or pass an operationId.
```

### Webhooks

`--webhook` lists a webhook's operations the same way `--path` lists a path's (and, like `--path`, in the same card-shaped JSON):

```bash
redocly tree cafe.yaml --webhook=order-notification
```

```text
order-notification (1)
└── POST "Order notification webhook" 665..683 [Orders]
```

To list every webhook across the whole description at once — the plural flag, not a specific name — see [List every operation or webhook](#list-every-operation-or-webhook) below.

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
  "security": {
    "requirements": [],
    "schemes": []
  },
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

```text
schemas (15)
├── Page 823..866
├── MenuBaseItem 868..922
├── Beverage 924..942
├── Dessert 944..958
├── MenuItem 960..969
├── MenuItemList 971..986
├── Error 988..1023
├── OrderStatus "Order status." 1025..1031
├── Order 1033..1106
├── OrderList 1108..1123
├── OrderItem 1125..1151
├── RevenueStatistics "Revenue statistics for a given date range." 1153..1205
├── RegisterClientObject 1207..1238
├── OAuth2Client "OAuth2 client registration response. Per RFC 7591, includes the client identifier, secret, timestamps, and all registered client metadata." 1240..1308
└── OrderNotification 1310..1324
```

Accepted section names are `schemas`, `responses`, `parameters`, `requestBodies`, `headers`, `securitySchemes`, `examples`, `links`, and `callbacks`.
An unknown section lists the valid ones:

```bash
redocly tree cafe.yaml --component=widgets
```

```text
Unknown component section "widgets". Sections: schemas, responses, parameters, requestBodies, headers, securitySchemes, examples, links, callbacks.
```

Add `--name` for a single component card, with its one-hop `refs` and `usedBy`:

```bash
redocly tree cafe.yaml --component=schemas --name=Order
```

```text
schemas/Order
├── source: cafe.yaml#/components/schemas/Order  [1033..1106]
├── refs (1)
│   └── schemas/OrderStatus → cafe.yaml#/components/schemas/OrderStatus  [1025..1031]
└── usedBy (4)
    ├── GET /orders/{orderId} → cafe.yaml  [375..416]
    ├── PATCH /orders/{orderId} → cafe.yaml  [418..476]
    ├── POST /orders → cafe.yaml  [316..372]
    └── schemas/OrderList → cafe.yaml  [1108..1123]
```

`usedBy` here shows every operation and component with a direct reference to `Order` — one hop only; for the transitive version see `--used-by` below.
`--component` is mutually exclusive with `--tag`, `--path`, `--webhook`, `--file`, and `--operation`.

`--format=ai` turns the same selection into a text card instead of a `refs`/`usedBy` tree: coordinates, a compact `signature:` line, and — without `--with-deps` — the component's own body as one line of minified JSON, which answers "what fields does this have" directly instead of by way of a reverse-dependency dump:

```bash
redocly tree cafe.yaml --component=schemas --name=OrderNotification --format=ai
```

```text
schemas/OrderNotification · cafe.yaml L1310-1324
signature: orderId*:string, orderStatus*→OrderStatus, timestamp*:string
--- json
{"type":"object","required":["orderId","orderStatus","timestamp"],"properties":{"orderId":{"type":"string","description":"Unique order identifier."},"orderStatus":{"$ref":"#/components/schemas/OrderStatus"},"timestamp":{"type":"string","format":"date-time","description":"When the event occurred."}}}
refs: schemas/OrderStatus L1025
usedBy: 1 (--used-by)
next: --with-deps · --component=<section> --name=<Name> (any id above) · --pointer=<$ref>
```

The `signature:` line uses the same compact grammar as a `--with-deps` closure entry below (`field*` for a required property, `field:type`, `field→Target` for a `$ref`); `refs` compresses to one line per reference since there's no `--with-deps` closure here to supersede it, and `usedBy` is a bare count plus the flag that expands it.

Component addressing by `--component`/`--name` requires the root document to declare the component (`components: {schemas: {Order: {$ref: ./Order.yaml}}}` or inline).
A fully split layout with no root registry — where operation files reference component files directly, as [`redocly split`](./split.md) produces — has nothing to list.
The example below runs against a multi-file version of the same API (a directory produced by [split](./split.md)).

```bash
redocly tree cafe-split/cafe.yaml --component=schemas
```

```text
schemas (0)
```

Use `--files` to see those components' files instead, or read a card's `refs[].file`/`usedBy[].file`.
A component invisible to `--component` this way still has real `$ref` edges in the graph — see [List what one file defines](#list-what-one-file-defines) below for how `--file --used-by` reaches it anyway.

### List what one file defines

`--file=<path>` shows every operation and component a single file defines — most useful on a split, multi-file layout, where `--component`/`--name` can't address a component the root document never registers (see the empty listing just above).
The path is resolved the same way as other file arguments elsewhere in the CLI: relative to the API's own directory first, falling back to the current directory.

```bash
redocly tree cafe-split/cafe.yaml --file=paths/orders.yaml
```

```text
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
      "security": {
        "requirements": [
          {
            "OAuth2": ["orders:read"]
          }
        ],
        "schemes": [
          {
            "name": "OAuth2",
            "type": "oauth2"
          }
        ]
      },
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
      "security": {
        "requirements": [
          {
            "OAuth2": ["orders:write"]
          }
        ],
        "schemes": [
          {
            "name": "OAuth2",
            "type": "oauth2"
          }
        ]
      },
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
It's mutually exclusive with every typed selector (`--tag`, `--path`, `--webhook`, `--operation`, `--component`, `--name`) and with `--operations`, `--webhooks`; combining it with `--with-deps` is rejected the same way an incomplete selector is:

```text
--with-deps requires an operation or component selection.
```

### List every operation or webhook

`--operations` lists every operation the same way `--tag` does, but for the whole description; JSON entries are the same card shape shown under `--tag` above:

```bash
redocly tree cafe.yaml --operations
```

```text
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
    "security": {
      "requirements": [],
      "schemes": []
    },
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
`--operations` and `--webhooks` are each mutually exclusive with every selector — they're already "give me everything," so a narrower selector alongside them makes no sense.

### Search with --find

`--find=<terms>` searches the whole description at once — operations (including webhook operations) and components — instead of listing a whole tag, path, or section.
Terms split on whitespace and match case-insensitively as substrings against the operation path, operationId, summary, description, and tag names, or the component name; every term must hit the same entry.
Matches are ranked by how many fields they hit — a path, id, or name hit outranks a summary or description hit — and grouped operations before components.
It's a standalone selector: it doesn't combine with `--tag`, `--path`, `--webhook`, `--operation`, `--component`, `--file`, `--used-by`, or `--with-deps`.

```bash
redocly tree cafe.yaml --find "order status"
```

```text
find "order status" · 1 operations · 1 components

/orders/{orderId} (1)
└── PATCH "Partially update an order" 418..476 [Orders]

components (1)
└── schemas/OrderStatus "Order status." 1025..1031
```

`--format=ai` renders the same ranked matches as text lines, one per entry, in the same operation and component line shapes every other listing uses — covered in its own section right after this one:

```bash
redocly tree cafe.yaml --find "order status" --format=ai
```

```text
find "order status" · 1 operation · 1 component
patch /orders/{orderId} · updateOrder · L418 — Partially update an order
schemas/OrderStatus · L1025 — Order status.
next: --path=<p> --operation=<method> [--with-deps] · --component=<section> --name=<Name>
```

`--format=json` returns the same result as data: `{ terms, operations, components, totalOperations, totalComponents }`, with each entry in the same card shape `--tag`/`--component` use above, including their `refs` and `usedBy`.
Each kind is capped at 20 entries; past the cap, `--format=ai` adds a line like `… 5 more operations — narrow the terms.` instead of growing without bound, and a search with no matches at all prints `Nothing matched.`

Combining `--find` with another selector is rejected the same way an incompatible pair of typed selectors is:

```bash
redocly tree cafe.yaml --find "order status" --tag=Orders
```

```text
--find is a standalone search and cannot be combined with other selectors.
```

### Navigate by pointer

`--pointer='<json-pointer>'` looks up a raw JSON pointer instead of a typed selector — the same pointer a lint problem's `location`, a `$ref` value, or a `--format=json` `pointer` field already gives you, so there's no translating it into `--tag`/`--path`/`--component` flags first.
It accepts the pointer with or without the leading `#`, and reads `~0`/`~1` escapes the same way a `$ref` does (`~1` for `/`, `~0` for `~`).
It's a standalone selector, the same rule as `--find`: it doesn't combine with `--tag`, `--path`, `--webhook`, `--operation`, `--component`, `--name`, `--file`, `--find`, `--operations`, or `--webhooks`.

A pointer that lands on a component or an operation (`#/components/<section>/<name>`, `#/paths/<path>/<method>`, `#/webhooks/<name>/<method>`) routes to the exact same card `--component`/`--path --operation` would produce, and `--used-by`/`--with-deps` combine with it exactly as they do with a typed selection:

```bash
redocly tree cafe.yaml --pointer='#/components/schemas/OrderStatus' --format=ai
```

```text
schemas/OrderStatus · cafe.yaml L1025-1031 — Order status.
signature: string=placed|preparing|completed|canceled
--- json
{"type":"string","description":"Order status.","enum":["placed","preparing","completed","canceled"]}
usedBy: 3 (--used-by)
next: --with-deps · --component=<section> --name=<Name> (any id above) · --pointer=<$ref>
```

A pointer that lands exactly on a container boundary — the document root (`#/`, and an empty pointer), `#/paths`, `#/webhooks`, one component section (`#/components/<section>`), or one path (`#/paths/<path>`) — routes to the same bounded view its typed selector equivalent already produces, instead of slicing that whole subtree:

```bash
redocly tree cafe.yaml --pointer='#/paths' --format=ai
```

```text
operations · 12 operations
get /menu · listMenuItems · L32 — List all menu items
post /menu · createMenuItem · L113 — Create menu item
delete /menu/{menuItemId} · deleteMenuItem · L178 — Delete a menu item
get /menu-item-images/{menuItemId} · getMenuItemPhoto · L203 — Retrieve a menu item photo
get /orders · listOrders · L229 — List all orders
post /orders · createOrder · L316 — Create order
get /orders/{orderId} · getOrderById · L375 — Retrieve an order
delete /orders/{orderId} · deleteOrder · L478 — Delete an order
patch /orders/{orderId} · updateOrder · L418 — Partially update an order
get /order-items · listOrderItems · L505 — List all order items with menu item details
get /revenue · getRevenue · L549 — Get revenue statistics
post /oauth2/register · registerOAuth2Client · L604 — Create OAuth2 client
next: --path=<p> --operation=<method> [--with-deps]
```

`#/components` on its own isn't a bounded view — point one level deeper instead:

```bash
redocly tree cafe.yaml --pointer='#/components'
```

```text
Point one level deeper: --pointer='#/components/<section>'. Sections: schemas, responses, parameters, requestBodies, headers, securitySchemes, examples, links, callbacks.
```

A pointer that resolves anywhere else in the document — inside a schema's properties, for instance — returns a pointer card instead: the node's own coordinates and body, its own `refs`, and the nearest indexed ancestor with its `usedBy` count and a ready-to-paste `--pointer` hint, since the deep node itself has no reverse edges of its own to report:

```bash
redocly tree cafe.yaml --pointer='#/components/schemas/Order/properties/status' --format=ai
```

```text
pointer #/components/schemas/Order/properties/status · cafe.yaml L1059-1061
--- json
{"allOf":[{"$ref":"#/components/schemas/OrderStatus"}],"readOnly":true}
refs: schemas/OrderStatus L1025
ancestor: schemas/Order L1033-1106 · usedBy: 4 (--used-by --pointer='#/components/schemas/Order')
```

`--used-by`/`--with-deps` on that same deep pointer are rejected, naming the ancestor as the nearest node that supports them:

```text
--used-by and --with-deps need an indexed node. Nearest: --pointer='#/components/schemas/Order'
```

A pointer that resolves nowhere in the document errors with the nearest pointer prefix that does resolve, so a typo or an over-deep path is easy to walk back:

```bash
redocly tree cafe.yaml --pointer='#/components/schemas/Order/properties/bogus'
```

```text
Nothing at "#/components/schemas/Order/properties/bogus". Nearest resolvable: #/components/schemas/Order/properties.
```

`--pointer` resolves against the root document only in this version.
A pointer that only makes sense after following a `$ref` into another file — a deep path inside a component defined in a split-out file, for example — is out of scope for now; resolve the component or operation that owns it instead, or bundle the description first.

### Plain text for agents: `--format=ai`

`--format=json` (used throughout the examples above) is the tooling/debug format: full card-shaped entries — coordinates, a `security` object holding the effective `requirements` and the `schemes` they name, a one-hop `refs` array, and `usedBy` — pretty-printed with two-space indentation.
`--format=ai` is the agent format, and it's plain text: no braces, keys, or quotes in a listing, an overview, or a find result.
Two views break that rule: a card's own body ships as one line of minified JSON (below), and the file-level graph, which `--files` and a non-OpenAPI description still render as minified JSON:

```bash
redocly tree asyncapi.yaml --format=ai
```

```text
{"nodes":[{"id":"asyncapi.yaml","resolved":true,"kind":"root","file":"asyncapi.yaml","root":true},{"id":"channels/userSignedup","resolved":true,"kind":"component","file":"asyncapi.yaml"},…],"links":[{"source":"channels/userSignedup","target":"messages/UserSignedUp","refs":["#/components/messages/UserSignedUp"]},…]}
```

Every `ai` view shares the same conventions:

- The first line states what was selected, its counts, and, for a single-item card, its file.
- `·` separates fields on a line; `—` precedes a summary or piece of prose.
- `L<start>` marks a single line, `L<start>-<end>` a range — fetch a card, or read the file directly, for the text in between.
- A trailing `…` marks prose that was clipped to whole sentences; the line range on the same entry leads to the full text.
- `security:` on an overview and `auth:` on a card name what the caller has to send: `|` separates alternatives, `+` schemes that apply together, and each name is followed by the scheme's own terms — `apiKey in header REB-APIKEY`, `http bearer`, `oauth2 (orders:write)`.
- A listing entry adds a trailing `· f:<relative path>` only once the listing spans more than one file, the same rule the stylish listings use.
- The last line is `next:`, naming the flags that continue from this view.
  Every id above it — `schemas/Order`, a `deeper:` entry — is already a selector, and every `$ref` inside a card body is a `--pointer` argument, so an agent can run the whole chain from the output alone without reading this page.

On a listing view (`--tag`; `--path`/`--webhook` without `--operation`; `--operations`; `--webhooks`; `--component` without `--name`; a `--file` card's `defines`; `--find`, shown in its own section above), each entry is one line instead of a card:

```bash
redocly tree cafe.yaml --tag=Orders --format=ai
```

```text
Orders · 6 operations
get /orders · listOrders · L229 — List all orders
post /orders · createOrder · L316 — Create order
get /orders/{orderId} · getOrderById · L375 — Retrieve an order
delete /orders/{orderId} · deleteOrder · L478 — Delete an order
patch /orders/{orderId} · updateOrder · L418 — Partially update an order
get /order-items · listOrderItems · L505 — List all order items with menu item details
next: --path=<p> --operation=<method> [--with-deps]
```

An operation line is `method path · operationId · L<start> — summary`, dropping `operationId` when the operation has none — only the start line is given, since a card or a plain file read gets the range.
A webhook line adds `webhook` before the name (`method webhook name · operationId · L<start> — summary`), and a component listing line drops the method and path entirely — `section/name · L<start>`, with `— summary` appended only when the component has one:

```bash
redocly tree cafe.yaml --component=schemas --format=ai
```

```text
schemas · 15 components
schemas/Page · L823
schemas/MenuBaseItem · L868
schemas/Beverage · L924
schemas/Dessert · L944
schemas/MenuItem · L960
schemas/MenuItemList · L971
schemas/Error · L988
schemas/OrderStatus · L1025 — Order status.
schemas/Order · L1033
schemas/OrderList · L1108
schemas/OrderItem · L1125
schemas/RevenueStatistics · L1153 — Revenue statistics for a given date range.
schemas/RegisterClientObject · L1207
schemas/OAuth2Client · L1240 — OAuth2 client registration response. Per RFC 7591, includes the client identifier, secret, timestamps, and all registered client metadata.
schemas/OrderNotification · L1310
next: --component=schemas --name=<Name> [--with-deps]
```

On cafe.yaml, this same `--tag=Orders` selection is 15,645 bytes as `--format=json` and 486 bytes as `--format=ai` — a 97% reduction.
Both formats start from the same six operations, so the whole difference is the JSON envelope: keys, quotes, braces, and each entry's `refs`/`usedBy` array.
That envelope is a fixed cost per entry, so the gap widens with the listing — a tag or file with hundreds of operations saves proportionally more than one with six.

The `f:` suffix shows up once a listing spans more than one file — the same tag, split across files by [`split`](./split.md), carries it on every line:

```bash
redocly tree cafe-split/cafe.yaml --tag=Orders --format=ai
```

```text
Orders · 6 operations
get /orders · listOrders · L2 · f:cafe-split/paths/orders.yaml — List all orders
post /orders · createOrder · L64 · f:cafe-split/paths/orders.yaml — Create order
get /orders/{orderId} · getOrderById · L2 · f:cafe-split/paths/orders_{orderId}.yaml — Retrieve an order
delete /orders/{orderId} · deleteOrder · L102 · f:cafe-split/paths/orders_{orderId}.yaml — Delete an order
patch /orders/{orderId} · updateOrder · L45 · f:cafe-split/paths/orders_{orderId}.yaml — Partially update an order
get /order-items · listOrderItems · L2 · f:cafe-split/paths/order-items.yaml — List all order items with menu item details
next: --path=<p> --operation=<method> [--with-deps]
```

A view with no listing to project — the overview, a `--used-by` report — still switches to the same conventions, just with less to strip:

```bash
redocly tree cafe.yaml --format=ai
```

```text
cafe.yaml · oas3_2 — Redocly Cafe — Demo API for cafe operators (not customers) to manage menus, orders, and revenue. Create API credentials and try it yourself in a realistic…
servers: https://api.cafe.redocly.com
12 operations · 4 tags · 1 webhook operation
components: schemas 15 · responses 6 · parameters 9 · securitySchemes 2
tag Authorization (1):
post /oauth2/register · registerOAuth2Client · L604 — Create OAuth2 client
tag Products (4):
get /menu · listMenuItems · L32 — List all menu items
post /menu · createMenuItem · L113 — Create menu item
delete /menu/{menuItemId} · deleteMenuItem · L178 — Delete a menu item
get /menu-item-images/{menuItemId} · getMenuItemPhoto · L203 — Retrieve a menu item photo
tag Orders (6):
get /orders · listOrders · L229 — List all orders
post /orders · createOrder · L316 — Create order
get /orders/{orderId} · getOrderById · L375 — Retrieve an order
delete /orders/{orderId} · deleteOrder · L478 — Delete an order
patch /orders/{orderId} · updateOrder · L418 — Partially update an order
get /order-items · listOrderItems · L505 — List all order items with menu item details
tag Statistics (1):
get /revenue · getRevenue · L549 — Get revenue statistics
webhooks (1):
post webhook order-notification · orderNotificationWebhook · L665 — Order notification webhook
next: --find=<terms> · --tag=<name> · --path=<p> --operation=<method> [--with-deps] · --component=<section> --name=<n>
```

This is the same overview shown under [Get an overview of an API description](#get-an-overview-of-an-api-description) above, expanded into per-tag operation lines the way listings render them — the default view does the same once a description is at or under 100 operations, which is why cafe.yaml's 12 expand here.
Past that limit the overview falls back to tag names and counts only (`tags: Name N · Name N · …`) plus a webhook count, the same collapse the default view does; the closing `next:` line is always there, expanded or not, pointing at `--find` and the typed selectors.
`--used-by` renders the same conventions as a report: a `used-by <target>` header with the target's own coordinates, then `operations (N):`/`components (N):` groups, one line per referrer (`method path · L<start> via <id> → <id>`, a file suffix only when it differs from the target's own file), or `Nothing references it.` when nothing does.
`--with-deps` is where `ai` saves the most — schema signatures instead of raw YAML — covered in its own section right after `--with-deps` below.

### Fetch everything a selection needs: `--with-deps`

Add `--with-deps` to an operation or component selection to append its raw source (`content`) and the transitive `$ref` closure (`deps`), each entry with its own `content` and one-hop `refs`, in dependency order, capped at 64 KB with a `truncated` marker:

```bash
redocly tree cafe.yaml --path=/orders --operation=post --with-deps --format=json
```

<!-- markdownlint-disable MD013 -->

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
  "security": {
    "requirements": [
      {
        "OAuth2": ["orders:write"]
      }
    ],
    "schemes": [
      {
        "name": "OAuth2",
        "type": "oauth2"
      }
    ]
  },
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
      "end_line": 1106,
      "component": "schemas",
      "name": "Order"
    }
  ],
  "usedBy": [],
  "content": "      tags:\n        - Orders\n      summary: Create order\n      description: >\n        Create a new order.\n\n        Order items cannot be changed - if they need to be updated, cancel the\n        order and place a new one.\n      operationId: createOrder\n      security:\n        - OAuth2:\n            - orders:write\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              $ref: '#/components/schemas/Order'\n            examples:\n              OrderRequest:\n                dataValue:\n                  customerName: Mary Ann\n                  orderItems:\n                    - menuItemId: prd_01h1s5z6vf2mm1mz3hevnn9va7\n                      quantity: 2\n                      comment: No sugar!\n                      discount: 0\n      responses:\n        '201':\n          description: Order placed successfully.\n          content:\n            application/json:\n              schema:\n                $ref: '#/components/schemas/Order'\n              examples:\n                OrderResponse:\n                  dataValue:\n                    id: ord_01h1s5z6vf2mm1mz3hevnn9va7\n                    customerName: Mary Ann\n                    orderItems:\n                      - menuItemId: prd_01h1s5z6vf2mm1mz3hevnn9va7\n                        quantity: 2\n                        comment: No sugar!\n                        discount: 0\n                    object: order\n                    status: placed\n                    totalPrice: 200\n                    createdAt: '2026-08-24T14:15:22Z'\n                    updatedAt: '2026-08-24T14:15:22Z'\n        '400':\n          $ref: '#/components/responses/BadRequest'\n        '401':\n          $ref: '#/components/responses/Unauthorized'\n        '403':\n          $ref: '#/components/responses/Forbidden'\n        '500':\n          $ref: '#/components/responses/InternalServerError'",
  "deps": [
    {
      "id": "responses/BadRequest",
      "pointer": "#/components/responses/BadRequest",
      "file": "cafe.yaml",
      "start_line": 1327,
      "end_line": 1331,
      "content": "      description: Bad request - invalid input parameters.\n      content:\n        application/problem+json:\n          schema:\n            $ref: '#/components/schemas/Error'",
      "refs": [
        {
          "ref": "#/components/schemas/Error",
          "resolved": true,
          "file": "cafe.yaml",
          "pointer": "#/components/schemas/Error",
          "start_line": 988,
          "end_line": 1023
        }
      ]
    },
    {
      "id": "responses/Forbidden",
      "pointer": "#/components/responses/Forbidden",
      "file": "cafe.yaml",
      "start_line": 1345,
      "end_line": 1349,
      "content": "      description: Forbidden - insufficient permissions.\n      content:\n        application/problem+json:\n          schema:\n            $ref: '#/components/schemas/Error'",
      "refs": [
        {
          "ref": "#/components/schemas/Error",
          "resolved": true,
          "file": "cafe.yaml",
          "pointer": "#/components/schemas/Error",
          "start_line": 988,
          "end_line": 1023
        }
      ]
    },
    {
      "id": "responses/InternalServerError",
      "pointer": "#/components/responses/InternalServerError",
      "file": "cafe.yaml",
      "start_line": 1333,
      "end_line": 1337,
      "content": "      description: Internal server error.\n      content:\n        application/problem+json:\n          schema:\n            $ref: '#/components/schemas/Error'",
      "refs": [
        {
          "ref": "#/components/schemas/Error",
          "resolved": true,
          "file": "cafe.yaml",
          "pointer": "#/components/schemas/Error",
          "start_line": 988,
          "end_line": 1023
        }
      ]
    },
    {
      "id": "responses/Unauthorized",
      "pointer": "#/components/responses/Unauthorized",
      "file": "cafe.yaml",
      "start_line": 1339,
      "end_line": 1343,
      "content": "      description: Unauthorized - authorization required.\n      content:\n        application/problem+json:\n          schema:\n            $ref: '#/components/schemas/Error'",
      "refs": [
        {
          "ref": "#/components/schemas/Error",
          "resolved": true,
          "file": "cafe.yaml",
          "pointer": "#/components/schemas/Error",
          "start_line": 988,
          "end_line": 1023
        }
      ]
    },
    {
      "id": "schemas/Order",
      "pointer": "#/components/schemas/Order",
      "file": "cafe.yaml",
      "start_line": 1033,
      "end_line": 1106,
      "content": "      type: object\n      title: Order\n      properties:\n        id:\n          description: Order ID. Unique identifier prefixed with `ord_`.\n          type: string\n          format: ulid\n          readOnly: true\n          pattern: ^ord_[0-9abcdefghjkmnpqrstvwxyz]{26}$\n          example: ord_01h1s5z6vf2mm1mz3hevnn9va7\n        object:\n          description: Entity name.\n          type: string\n          const: order\n          readOnly: true\n        customerName:\n          description: >\n            Name of the customer who placed the order.\n\n            Must start and end with a letter, and can contain letters, spaces,\n            hyphens, and apostrophes (e.g., \"John Doe\", \"Mary-Jane\", \"O'Brien\").\n          type: string\n          pattern: ^[A-Za-z]+(?:[\\s'-][A-Za-z]+)*$\n          minLength: 1\n          maxLength: 100\n        status:\n          allOf:\n            - $ref: '#/components/schemas/OrderStatus'\n          readOnly: true\n        totalPrice:\n          description: Total order price in cents.\n          type: integer\n          minimum: 0\n          readOnly: true\n        createdAt:\n          description: Created date.\n          type: string\n          format: date-time\n          readOnly: true\n        updatedAt:\n          description: Updated date.\n          type: string\n          format: date-time\n          readOnly: true\n        orderItems:\n          type: array\n          description: List of items to include in the order.\n          minItems: 1\n          items:\n            type: object\n            properties:\n              menuItemId:\n                type: string\n                format: ulid\n                description: ID of the menu item to add to the order.\n              quantity:\n                type: integer\n                minimum: 1\n                description: Quantity of the menu item.\n              discount:\n                type: integer\n                minimum: 0\n                description: Discount amount in cents (absolute value).\n                default: 0\n              comment:\n                type: string\n                maxLength: 500\n                description: Optional comment for the order item (e.g., \"No sugar\").\n            required:\n              - menuItemId\n              - quantity\n      required:\n        - customerName\n        - orderItems",
      "refs": [
        {
          "ref": "#/components/schemas/OrderStatus",
          "resolved": true,
          "file": "cafe.yaml",
          "pointer": "#/components/schemas/OrderStatus",
          "start_line": 1025,
          "end_line": 1031
        }
      ]
    },
    {
      "id": "schemas/Error",
      "pointer": "#/components/schemas/Error",
      "file": "cafe.yaml",
      "start_line": 988,
      "end_line": 1023,
      "content": "      type: object\n      properties:\n        type:\n          type: string\n          format: uri-reference\n          description: URI reference that identifies the problem type.\n          default: about:blank\n        title:\n          type: string\n          description: Short summary of the problem type.\n        status:\n          type: integer\n          format: int32\n          description: >\n            HTTP status code generated by the origin server for this occurrence\n            of the problem.\n          minimum: 100\n          exclusiveMaximum: 600\n        instance:\n          type: string\n          format: uri-reference\n          description: >\n            URI reference that identifies the specific occurrence of the\n            problem, e.g. by adding a fragment identifier or sub-path to the\n            problem type.\n\n            Can be used to locate the root of this problem in the source code.\n          example: /some/uri-reference#specific-occurrence-context\n        details:\n          description: Additional error details.\n          type: object\n          additionalProperties: true\n      required:\n        - type\n        - title\n        - status",
      "refs": []
    },
    {
      "id": "schemas/OrderStatus",
      "pointer": "#/components/schemas/OrderStatus",
      "file": "cafe.yaml",
      "start_line": 1025,
      "end_line": 1031,
      "content": "      type: string\n      description: Order status.\n      enum:\n        - placed\n        - preparing\n        - completed\n        - canceled",
      "refs": []
    }
  ]
}
```

<!-- markdownlint-enable MD013 -->

The `content` values above are elided (`…`); the real output carries the actual raw source lines for the operation and for every dependency.
`--with-deps` also works on a component selection (`--component` + `--name`), and is mutually exclusive with `--used-by`.

`--format=stylish` (the default) never prints raw source — that stays JSON-only — but it does render the dependency closure as a fourth branch, `deps (N, X KB of 64 KB cap)`, one line per dependency in the same order as the JSON `deps` array:

```bash
redocly tree cafe.yaml --path=/orders --operation=post --with-deps
```

```text
POST /orders — Create order (createOrder)
├── source: cafe.yaml#/paths/~1orders/post  [316..372]
├── refs (5)
│   ├── responses/BadRequest → cafe.yaml#/components/responses/BadRequest  [1327..1331]
│   ├── responses/Forbidden → cafe.yaml#/components/responses/Forbidden  [1345..1349]
│   ├── responses/InternalServerError → cafe.yaml#/components/responses/InternalServerError  [1333..1337]
│   ├── responses/Unauthorized → cafe.yaml#/components/responses/Unauthorized  [1339..1343]
│   └── schemas/Order → cafe.yaml#/components/schemas/Order  [1033..1106]
├── usedBy (none)
└── deps (7, 4.2 KB of 64 KB cap)
    ├── responses/BadRequest → cafe.yaml  [1327..1331]
    ├── responses/Forbidden → cafe.yaml  [1345..1349]
    ├── responses/InternalServerError → cafe.yaml  [1333..1337]
    ├── responses/Unauthorized → cafe.yaml  [1339..1343]
    ├── schemas/Order → cafe.yaml  [1033..1106]
    ├── schemas/Error → cafe.yaml  [988..1023]
    └── schemas/OrderStatus → cafe.yaml  [1025..1031]
```

Each `deps` entry is `id → file  [start..end]`, the same arrow shape as `refs`, without the pointer (a dependency's own `refs` are one selector away, or in the JSON `deps[].refs`).
When the closure hits the cap, the label ends with `(truncated)`: `deps (12, 64.0 KB of 64 KB cap) (truncated)`.
Each dependency's own raw source is available the same way, one selector at a time, or in full through `--format=json`.

### Schema signatures instead of raw YAML: `--with-deps --format=ai`

A `--with-deps` closure is where `--format=ai` does the most, because raw YAML is where most of a closure's bytes go — and much of it is branches the caller doesn't end up using: a schema's `anyOf`/`oneOf` hands over every alternative it could be, not the one the caller picked.
For each dependency within two `$ref` hops of the selection, `ai` renders a compact signature instead: `field*` for a required property, `field:type` (a type array renders `integer|null`), up to six enum values as `field:type=a|b|c`, and `field→Target` for a `$ref` — with a schema's composition named in a header, `[anyOf: A, B, C]`/`[oneOf: …]`/`[allOf: …]`/`[discriminator: propertyName]`, and an `allOf`-wrapped schema's members merged into one property list first, so it still shows its fields.
A non-schema dependency (a response, parameter, example, or header) has no property list, just a one-line summary or its `$ref` target.
Anything more than two hops from the selection is listed as a bare id under `deeper`, with a `hint` for fetching it directly — the format hands over a map of what exists and lets the caller decide what's worth a second call, instead of inlining every branch up front.

```bash
redocly tree cafe.yaml --path=/orders --operation=post --with-deps --format=ai
```

<!-- markdownlint-disable MD013 -->

```text
post /orders · createOrder · cafe.yaml L316-372 · tags: Orders — Create order
auth: OAuth2 · oauth2 (orders:write)
--- json
{"tags":["Orders"],"summary":"Create order","description":"Create a new order.\nOrder items cannot be changed - if they need to be updated, cancel the order and place a new one.\n","operationId":"createOrder","security":[{"OAuth2":["orders:write"]}],"requestBody":{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/Order"},"examples":{"OrderRequest":{"dataValue":{"customerName":"Mary Ann","orderItems":[{"menuItemId":"prd_01h1s5z6vf2mm1mz3hevnn9va7","quantity":2,"comment":"No sugar!","discount":0}]}}}}}},"responses":{"201":{"description":"Order placed successfully.","content":{"application/json":{"schema":{"$ref":"#/components/schemas/Order"},"examples":{"OrderResponse":{"dataValue":{"id":"ord_01h1s5z6vf2mm1mz3hevnn9va7","customerName":"Mary Ann","orderItems":[{"menuItemId":"prd_01h1s5z6vf2mm1mz3hevnn9va7","quantity":2,"comment":"No sugar!","discount":0}],"object":"order","status":"placed","totalPrice":200,"createdAt":"2026-08-24T14:15:22Z","updatedAt":"2026-08-24T14:15:22Z"}}}}}},"errors":"400, 401, 403, 500"}}
--- deps (7, signatures depth ≤2)
responses/BadRequest L1327-1331: Bad request - invalid input parameters.
responses/Forbidden L1345-1349: Forbidden - insufficient permissions.
responses/InternalServerError L1333-1337: Internal server error.
responses/Unauthorized L1339-1343: Unauthorized - authorization required.
schemas/Order L1033-1106: id:string, object:string, customerName*:string, status, totalPrice:integer, createdAt:string, updatedAt:string, orderItems*:array
schemas/Error L988-1023: type*:string, title*:string, status*:integer, instance:string, details:object
schemas/OrderStatus L1025-1031: string=placed|preparing|completed|canceled
next: --component=<section> --name=<Name> (any id above) · --pointer=<$ref>
```

<!-- markdownlint-enable MD013 -->

An `auth:` line opens the card whenever the operation's security is decided, resolved from the operation's own `security` or, when it declares none, from the root requirement it inherits — the case the operation's source does not show at all.
An operation that declares `security: []` overrides that inheritance and reads `auth: none`, which is not the same as no line at all.
Each scheme is printed with what it asks for, because the name alone does not say which header carries the key.
On a description that states its requirement once at the root, every operation card carries that inherited line, and the overview states it too:

```text
security: SecretApiKey · apiKey in header REB-APIKEY | JWT · http bearer
```

The card's own `content` (the `--- json` block) is never converted to a signature — that's where the operation's real contract lives, including the request/response examples above.
It's the parsed body, serialized as one line of minified JSON instead of the indented source, with two parts shortened because they are read rather than called: prose longer than 600 characters on the card's own node, or 120 on a field inside it, keeps whole sentences up to that length and ends in `…`, and error responses fold to an `errors` list of the codes they answer with — the response components themselves stay in `--- deps`, so nothing becomes unreachable.
Everything else survives; only the YAML comments are lost.
Both shortenings belong to `ai`: `--format=json` returns the body whole, and every card carries the line range that leads to the source.
A top-level `x-*` vendor key — a code-samples block, most often — folds to an `"omitted (L<start>-<end>)"` marker with its own source coordinates instead, since those blocks can dwarf the rest of the card; fetch the range directly with `--format=json` or a plain file read when the samples themselves are what's needed.
Content that fails to parse falls back to a `--- yaml` block with the raw source instead.
Each `--- deps` line is `id L<start>-<end>: signature`, with a `· f:<path>` suffix only when a dependency lives in a different file than the card.
`Order`'s `status` property is itself a `$ref` to `OrderStatus`, an enum-only schema one hop further away than `Order`, so it's still within the two-hop window and gets its own signature (`string=placed|preparing|completed|canceled`) instead of being cut off; a `deeper:` line with a ready-to-run `hint:` would list anything past that window, and both are absent here because nothing in this closure sits further out.
On cafe.yaml, this same card is 10,919 bytes as `--format=json` (which includes the full raw content shown above, not the elided placeholder used elsewhere in this guide) and 1,920 bytes as `--format=ai` — an 82% reduction: the five dependencies above shrink to one-line signatures, and the card's own body serializes as minified JSON instead of indented YAML.
The effect grows with the schema graph: a closure that pulls in `anyOf`/`oneOf` branches the caller doesn't end up using, or dependencies with many more properties than `Order`'s eight, saves more per entry than this example does.

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
    "end_line": 1106
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
      "end_line": 1123,
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

```text
Add --name to use --used-by or --with-deps with --component.
```

On a `--path` or `--webhook` selection, that means adding `--operation`:

```text
--used-by requires --operation, or --component with --name.
```

`--used-by` and `--with-deps` answer different questions — what a selection depends on, versus what depends on it — so they're mutually exclusive:

```bash
redocly tree cafe.yaml --component=schemas --name=Order --used-by --with-deps
```

```text
Arguments used-by and with-deps are mutually exclusive
```

### Empty and no-match results

A selector that exists but holds nothing, and a search that matches nothing, are not errors: they exit `0` and say so.

A search with no hits reports both counts as zero and suggests how to widen it:

```bash
redocly tree cafe.yaml --find "graphql subscription" --format=ai
```

```text
find "graphql subscription" · 0 operations · 0 components
Nothing matched.
next: --find=<fewer or different terms> · --tag=<name>
```

A component section the description doesn't use renders as an empty listing:

```bash
redocly tree cafe.yaml --component=links --format=ai
```

```text
links · 0 components
next: --component=links --name=<Name> [--with-deps]
```

A file that defines nothing of its own — one that only groups others through `$ref` — still gets a card, with an empty `defines`.

Only a name that doesn't exist at all is an error, and that is the next section.

### Selector errors

An unknown tag, path, webhook, operationId, or component name exits with code `1` and lists close matches, so a typo is easy to spot and fix:

```bash
redocly tree cafe.yaml --tag=Order
```

```text
No tag "Order". Did you mean: Orders? Run `redocly tree <api>` to list tags.
```

Path, webhook, and operationId lookups report the same way:

```text
No path "/order". Did you mean: /order-items, /orders, /orders/{orderId}? Run `redocly tree <api> --operations` to list operations.
No operation "createOrde". Did you mean: createOrder? Run `redocly tree <api> --operations` to list operations.
No webhook "order-notificatio". Did you mean: order-notification?
```

Selector combinations that don't make sense are rejected before the description is even analyzed, for example a tag and a component section together:

```bash
redocly tree cafe.yaml --tag=Orders --component=schemas
```

```text
Arguments component and tag are mutually exclusive
```

The full set of rules:

- `--tag` excludes `--path`, `--webhook`, `--component`, `--file`, and `--operation` alone.
- `--path` and `--webhook` exclude each other, `--tag`, and `--file`.
- `--component` excludes `--tag`, `--path`, `--webhook`, `--file`, and `--operation`.
- `--file` excludes every typed selector (`--tag`, `--path`, `--webhook`, `--operation`, `--component`, `--name`) and the `--operations`/`--webhooks` listings, but combines with `--used-by`, and with `--files` to filter the file graph.
- `--webhooks` excludes every typed selector and the `--operations` listing.
- `--operations` excludes every selector, listing, and modifier.
- `--files` excludes every selector, listing, and modifier except `--file`.
- `--used-by` excludes `--with-deps`.
- `--find` excludes every other selector, listing, and modifier.
- `--pointer` excludes every other selector and listing the same way `--find` does, but combines with `--used-by`/`--with-deps` once it resolves to an indexed component or operation — a deep pointer rejects both with a hint naming its nearest indexed ancestor.

Selectors, listings, and `--used-by`/`--with-deps` are OpenAPI-only:

```bash
redocly tree async.yaml --tag=foo
```

```text
The tree selectors (--tag, --path, --operation, --webhook, --component, --name, --file, --find, --pointer, --operations, --webhooks, --used-by, --with-deps) support OpenAPI descriptions only for now.
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

```text
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
It doesn't accept the typed selectors, `--operations`/`--webhooks`, `--used-by`, or `--with-deps` — `--file` is the one exception, and filters the graph instead of selecting from it (see below).

`--format=ai` reports the same graph as a flat list — every file with how many refs leave it, and any that is external or unresolved marked as such:

```bash
redocly tree cafe-split/cafe.yaml --files --format=ai
```

```text
files · 40 files · 89 links
root: cafe.yaml
cafe.yaml · 9 refs
components/parameters/After.yaml
components/parameters/Before.yaml
components/parameters/Filter.yaml
components/parameters/Limit.yaml
components/parameters/MenuItemId.yaml
components/parameters/OrderId.yaml
components/parameters/PhotoSize.yaml
components/parameters/Search.yaml
components/parameters/Sort.yaml
components/responses/BadRequest.yaml · 1 ref
components/responses/Conflict.yaml · 1 ref
components/responses/Forbidden.yaml · 1 ref
components/responses/InternalServerError.yaml · 1 ref
components/responses/NotFound.yaml · 1 ref
components/responses/Unauthorized.yaml · 1 ref
components/schemas/Beverage.yaml · 1 ref
components/schemas/Dessert.yaml · 1 ref
components/schemas/Error.yaml
components/schemas/MenuBaseItem.yaml
components/schemas/MenuItem.yaml · 2 refs
components/schemas/MenuItemList.yaml · 2 refs
components/schemas/OAuth2Client.yaml
components/schemas/Order.yaml · 1 ref
components/schemas/OrderItem.yaml · 1 ref
components/schemas/OrderList.yaml · 2 refs
components/schemas/OrderNotification.yaml · 1 ref
components/schemas/OrderStatus.yaml
components/schemas/Page.yaml
components/schemas/RegisterClientObject.yaml
components/schemas/RevenueStatistics.yaml
paths/menu-item-images_{menuItemId}.yaml · 4 refs
paths/menu.yaml · 13 refs
paths/menu_{menuItemId}.yaml · 6 refs
paths/oauth2_register.yaml · 5 refs
paths/order-items.yaml · 7 refs
paths/orders.yaml · 12 refs
paths/orders_{orderId}.yaml · 8 refs
paths/revenue.yaml · 5 refs
webhooks/order-notification.yaml · 3 refs
next: --file=<path> [--used-by] · --files --format=json for the whole graph
```

Past 40 files the list gives way to per-directory counts, the same trade the overview makes when it stops listing every operation: a description split into thousands of files has a graph larger than most of the description itself, and `--format=json` is there when the whole thing is what's wanted.

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
For the card-shaped view of what one file itself defines, or that file's own impact analysis, see [List what one file defines](#list-what-one-file-defines) above.

Component addressing by `--component`/`--name` needs the root document to declare the component (see [Component sections and one component](#component-sections-and-one-component) above); `--files` is what still works on a fully split layout that has no such registry.

### Write the output to a file: `--output`

Use `--output` (`-o`) to write any format to a file instead of `stdout`:

```bash
redocly tree cafe.yaml --format=json --output cafe-index.json
```

```text
Tree written to cafe-index.json
```

## The agent index

Large API descriptions do not fit in an LLM's context window.
Instead of feeding the whole file to a model, let the agent navigate the selector surface above in bounded steps.
Every result is generated deterministically from the document structure — no AI calls or API keys are needed.
It is available for OpenAPI descriptions; the typed selectors, `--used-by`, and `--with-deps` report an error for other specification types.
For measured costs — 360 agent runs over six descriptions, from 41 KB to 2,909 files, each compared against a read-and-search baseline — see [Where the index pays](../guides/tree-agent-index-benchmark.md).
For a precomputed, CLI-free variant of the same index — one text file an agent greps locally — see the [`generate-map` command](./generate-map.md).

When wiring this into an agent, hand it the run line with `--format=ai` and let the `next:` lines carry it from there.
Pasting this page into a prompt, or pointing an agent at it, costs 6,000 to 21,000 tokens depending on the model — more than the exploration it saves.
Leave `--format=ai` out and the saving goes with it: the stylish views are built for a terminal and carry no `next:` line, so an agent falls back to guessing flags and reading the file.

1. Get the map: `redocly tree openapi.yaml --format=ai` prints the servers, tag and webhook counts, and component sections — a couple of kilobytes for any file size. An API of 100 operations or fewer expands to its whole surface here, so small descriptions cost one call.
2. Narrow to candidates: `redocly tree openapi.yaml --find "create subscription" --format=ai` ranks operations and components by how many terms hit their path, id, name, summary, or description. This replaces browsing a tag listing, which on a large API is thousands of lines.
3. Fetch a leaf with everything it needs: `redocly tree openapi.yaml --path=/orders --operation=post --with-deps --format=ai` returns the operation's body plus its transitive `$ref` closure as one-line schema signatures — enough to generate a client call, write a contract test, or review the endpoint.
4. Keep going from the output: every view's `next:` line names the flags that continue from it, every id it prints (`schemas/Order`) is a selector, and every `$ref` in a body is a `--pointer` argument.

Use `--format=json` instead when a program, not a model, consumes the result: it returns the same selections as data, with raw source and exact coordinates.

Every operation and component entry carries the file that defines it, its `start_line`/`end_line` range, and a `summary` taken from the description itself, so an agent can also read the exact lines directly with plain file tools instead of calling the CLI again — this is the `json` shape of one entry:

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
