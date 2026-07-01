# `inspect`

## Introduction

The `inspect` command gives you a fast, human-readable overview of an API description in your terminal — plus a set of focused lenses to answer specific questions about it without scrolling through thousands of lines of YAML.

With no flags, `inspect` prints an overview card: title, version, servers, security schemes, the distribution of operations across tags, and high-level counts.
Each flag turns `inspect` into a focused lens — list the operations, slice by a tag, find where a component is used, audit which operations are public, and more.

{% admonition type="warning" name="OpenAPI 3.x and AsyncAPI 2.x/3.x" %}
`inspect` supports OpenAPI 3.x and AsyncAPI 2.x and 3.x descriptions.
For AsyncAPI, operations are grouped by channel and the lenses operate on channels, operations, and messages.
{% /admonition %}

Use `inspect` to:

- Get your bearings in an unfamiliar or large API at a glance.
- List and navigate operations grouped by tag (`--operations`, `--tag`).
- See where a shared component, parameter, or response is used before you change it (`--uses`).
- Audit which operations require which security scheme — or none at all (`--security`).
- Find deprecated operations and unused components during clean-up and migrations (`--deprecated`, `--unused`).

The output is written for humans: HTTP methods are color-coded, deprecated operations are dimmed, and counts are summarized.
When the output is piped or `NO_COLOR` is set, `inspect` degrades to plain, aligned text.

## Usage

```bash
redocly inspect
redocly inspect <api>
redocly inspect <api> [--operations] [--tag=<name>] [--uses=<name>] [--security=<scheme|none>] [--deprecated] [--unused] [--config=<path>]
```

With no API argument, `inspect` takes the API from the Redocly configuration file.

## Options

| Option       | Type     | Description                                                                                                                         |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| api          | string   | Path to the API description file or alias to inspect. Defaults to the API from the Redocly configuration file.                      |
| --deprecated | boolean  | Show only `deprecated` operations.                                                                                                  |
| --help       | boolean  | Show help.                                                                                                                          |
| --operations | boolean  | List all operations, grouped by tag.                                                                                                |
| --security   | string   | Filter operations by security scheme. Use `none` for public operations (declared with `security: []`).                              |
| --tag        | [string] | Show only operations with the given tag. Repeat the option to pass several tags.                                                    |
| --unused     | boolean  | List components declared under `components` but never referenced through `$ref`.                                                    |
| --uses       | [string] | Show what references the given component, parameter, or response — by bare name or JSON pointer. Repeat the option to pass several. |

## Examples

### Overview (default)

With no flags, `inspect` prints the overview card:

```bash
redocly inspect cafe.yaml
```

```text
Redocly Cafe  v1.0.0  ·  OpenAPI 3.2.0
Demo API for cafe operators to manage menus, orders, and revenue.
──────────────────────────────────────────────
Server     https://api.cafe.redocly.com
Security   OAuth2 · ApiKey

Operations by tag
  Orders         ███████████  6
  Products       ███████░░░░  4
  Authorization  ██░░░░░░░░░  1
  Statistics     ██░░░░░░░░░  1

Methods    GET ×6   POST ×3   PATCH ×1   DELETE ×2
12 operations · 15 schemas · 1 webhook · 4 tags
```

The bar chart shows how operations are distributed across tags, so you can see where the API's weight is at a glance.

### List operations — `--operations`

```bash
redocly inspect cafe.yaml --operations
```

```text
Operations · 12 across 4 tags

Authorization — Create a client to demo the API.
  POST    /oauth2/register                Create OAuth2 client

Products — Operations related to products.
  GET     /menu                           List all menu items
  POST    /menu                           Create menu item
  DELETE  /menu/{menuItemId}              Delete a menu item
  GET     /menu-item-images/{menuItemId}  Retrieve a menu item photo

… Orders (6), Statistics (1)
```

Operations are grouped by tag, each shown as `METHOD /path — summary`.
The output above is truncated for readability; the full output lists every tag and operation, followed by a `Webhooks` section for any top-level webhooks.

### Focus on a tag — `--tag`

```bash
redocly inspect cafe.yaml --tag Orders
```

```text
Orders · 6 operations
  GET     /orders            List all orders
  POST    /orders            Create order
  GET     /orders/{orderId}  Retrieve an order
  PATCH   /orders/{orderId}  Partially update an order
  DELETE  /orders/{orderId}  Delete an order
  GET     /order-items       List all order items with menu item details
```

Repeat `--tag` to include several tags at once.

### Find where a component is used — `--uses`

Use `--uses` to answer "what depends on this?" before you change or delete a shared component:

```bash
redocly inspect cafe.yaml --uses Filter
```

```text
parameter Filter — used by 3 operations
  GET  /menu         List all menu items
  GET  /orders       List all orders
  GET  /order-items  List all order items with menu item details
```

`--uses` accepts several input forms:

- a bare component name: `Filter`
- a full JSON pointer: `#/components/parameters/Filter`

Repeat `--uses` to query several targets at once.
A name that matches nothing prints a warning and still exits with code `0`, so a stale query never fails a CI run.

### Audit security — `--security`

Filter operations by the security scheme they require.
Use `none` to find public operations — those declared with `security: []`:

```bash
redocly inspect cafe.yaml --security none
```

```text
Operations with no security (public) · 4 found
  GET   /menu                           List all menu items
  GET   /menu-item-images/{menuItemId}  Retrieve a menu item photo
  POST  /oauth2/register                Create OAuth2 client
  POST  order-notification (webhook)    Order notification webhook
```

Pass a scheme name to see which operations accept it:

```bash
redocly inspect cafe.yaml --security ApiKey
```

```text
Operations accepting ApiKey · 1 found
  GET   /revenue   Get revenue statistics
```

### Find deprecated operations — `--deprecated`

```bash
redocly inspect cafe.yaml --deprecated
```

```text
Deprecated operations · 0 found
Nothing deprecated.
```

When nothing matches, `inspect` says so explicitly instead of printing an empty screen.

### Find unused components — `--unused`

```bash
redocly inspect cafe.yaml --unused
```

```text
Unused components · 0 found
Every component is referenced.
```

`--unused` lists components declared under `components` but never referenced through `$ref` — safe candidates for removal.

### Combine lenses

Filters combine with AND.
For example, list only the public operations of the `Products` tag:

```bash
redocly inspect cafe.yaml --tag Products --security none
```

```text
Products · public · 2 of 4 operations
  GET   /menu                           List all menu items
  GET   /menu-item-images/{menuItemId}  Retrieve a menu item photo
```

### Specify the API

Like other commands, `inspect` accepts a path or an API alias from your Redocly configuration file:

```bash
# a path
redocly inspect openapi/cafe.yaml

# an alias from the `apis` section of redocly.yaml
redocly inspect core@v1
```

With no argument, `inspect` uses the API from the configuration file.

### Use an alternative configuration file

By default, the CLI looks for the [Redocly configuration file](../configuration/index.md) in the current working directory.
Use `--config` to provide an alternative path:

```bash
redocly inspect cafe.yaml --config=./another/directory/redocly.yaml
```
