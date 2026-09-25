---
seo:
  title: Apply Overlays with Redocly CLI
  description: Apply Overlay files to an API description when you bundle it with Redocly CLI.
---

# Apply overlays

An [Overlay](https://spec.openapis.org/overlay/latest.html) is a file that describes changes to an API description, such as removing internal operations or replacing the servers.
The `bundle` command applies overlays while it creates the bundle, so you can publish several versions of an API from a single source.

{% admonition type="info" name="We recommend decorators for most tasks" %}
Use [decorators](../decorators.md) for most changes to an API description.
Built-in decorators, such as [`remove-x-internal`](../decorators/remove-x-internal.md), [`filter-out`](../decorators/filter-out.md), and [`info-override`](../decorators/info-override.md), cover the common tasks.
Decorators select nodes by type, such as every operation, so they keep working when you restructure the API description, while an overlay's JSONPath targets depend on where each node sits.

Use overlays for changes that come from other tools, such as the code samples that `generate-client` writes, or that other tools supporting the Overlay Specification must also apply.
{% /admonition %}

## Prerequisites

- [Install Redocly CLI](../installation.md) version 2.x.
- An API description to change.
  The examples use an `openapi.yaml` file whose `/tickets` path item lives in a separate `paths/tickets.yaml` file, with one operation marked `x-internal: true`.

## Write an overlay

An overlay has a list of `actions`.
Each action selects nodes in the API description with a [JSONPath](https://www.rfc-editor.org/rfc/rfc9535) expression in `target`, and then either removes them, merges an `update` value into them, or merges a `copy` of another node into them.

Create an `overlays/public.yaml` file with the following content:

```yaml
overlay: 1.1.0
info:
  title: Public Museum API
  version: 1.0.0
actions:
  - target: $.paths.*[?@['x-internal'] == true]
    description: Hide internal operations.
    remove: true
  - target: $.servers[*]
    description: Remove the staging server.
    remove: true
  - target: $.servers
    description: Add the production server.
    update:
      - url: https://api.example.com
  - target: $.paths['/tickets'].get
    update:
      description: Returns the tickets available for purchase.
```

The actions run in order, and each one works on the result of the previous one.
The second and third actions replace the servers: an `update` adds to an existing list, so the list is emptied first.

## Apply the overlay

Pass the overlay to the `bundle` command:

```bash
redocly bundle openapi.yaml --overlay=overlays/public.yaml -o dist/public.yaml
```

The bundle no longer has the internal operation, and it lists the production server:

```yaml
openapi: 3.1.0
info:
  title: Museum API
  version: 1.0.0
servers:
  - url: https://api.example.com
paths:
  /tickets:
    get:
      summary: List tickets
      operationId: listTickets
      responses:
        '200':
          description: OK
      description: Returns the tickets available for purchase.
components: {}
```

The `$.paths['/tickets'].get` target reaches the operation even though it lives in `paths/tickets.yaml`.
Overlays are applied to the bundled API description.
Write targets against the output of `redocly bundle openapi.yaml`.

To apply several overlays, repeat the option.
They are applied in the order you list them.

## Reuse actions and files

Overlay 1.2 lets you define an action once under `components.actions` and apply it to several targets.
A `$ref` in an overlay value can also point to a file.
The path is relative to the overlay file.

The following `overlays/errors.yaml` overlay adds the same `404` response to two operations:

```yaml
overlay: 1.2.0
info:
  title: Error responses
  version: 1.0.0
components:
  actions:
    notFound:
      description: Adds a 404 response to an operation.
      fields:
        update:
          '404':
            $ref: ./responses/NotFound.yaml
actions:
  - $ref: '#/components/actions/notFound'
    target: $.paths['/tickets'].get.responses
  - $ref: '#/components/actions/notFound'
    target: $.paths['/tickets'].post.responses
```

The `bundle` command pulls `overlays/responses/NotFound.yaml` into the bundle, like any other referenced file, and both operations point to it:

```yaml
paths:
  /tickets:
    get:
      responses:
        '200':
          description: OK
        '404':
          $ref: '#/components/responses/NotFound'
    post:
      responses:
        '201':
          description: Created
        '404':
          $ref: '#/components/responses/NotFound'
```

## Combine overlays with decorators

Overlays are applied before [decorators](../decorators.md), so decorators see the changes an overlay makes.
For example, an overlay can mark operations as internal, and the [`remove-x-internal`](../decorators/remove-x-internal.md) decorator then removes them.

Create an `overlays/mark-internal.yaml` overlay:

```yaml
overlay: 1.1.0
info:
  title: Mark internal operations
  version: 1.0.0
actions:
  - target: $.paths['/tickets'].post
    update:
      x-internal: true
```

Then turn on the decorator for the API that uses the overlay:

```yaml
apis:
  public:
    root: openapi.yaml
    overlays:
      - overlays/mark-internal.yaml
    decorators:
      remove-x-internal: on
```

When you run `redocly bundle public`, the bundle doesn't include the `POST /tickets` operation.

## Add code samples from a generated client

With `codeSamples: true` in the [`client`](../configuration/reference/client.md) configuration, the `generate-client` command writes an overlay next to the client that adds `x-codeSamples` to each operation.
Apply it like any other overlay, for example after the overlay that prepares the public version:

```bash
redocly bundle openapi.yaml --overlay=overlays/public.yaml --overlay=src/api/client.code-samples.yaml -o dist/public.yaml
```

## Configure overlays for each API

To publish an internal and a public version of the same API every time you bundle, list the overlays in the `apis` section of `redocly.yaml`:

```yaml
apis:
  internal:
    root: openapi.yaml
    output: dist/internal.yaml
  public:
    root: openapi.yaml
    output: dist/public.yaml
    overlays:
      - overlays/public.yaml
```

Paths in `overlays` are relative to the configuration file.

Run `bundle` without arguments to create both files:

```bash
redocly bundle
```

The `--overlay` option replaces the overlays from the configuration file, which is handy for trying out an overlay before you add it to the configuration.

## Fix overlay problems

If an action can't be applied, the `bundle` command shows where the problem is in the overlay file and doesn't create the bundle.
For example, the following action tries to merge an object into the `tags` list of an operation:

```yaml
overlay: 1.1.0
info:
  title: Broken
  version: 1.0.0
actions:
  - target: $.paths['/tickets'].get
    update:
      tags:
        name: public
```

The command reports the problem and points to the action:

```text
[1] overlays/broken.yaml:8:7 at #/actions/0/update

Cannot apply object to array at $['paths']['/tickets']['get']['tags'].

 6 | - target: $.paths['/tickets'].get
 7 |   update:
 8 |     tags:
   |     ^^^^^
 9 |       name: public
   |       ^^^^^^^^^^^^
10 |

Error was generated by the overlay rule.

❌ Errors encountered while bundling openapi.yaml: bundle not created (use --force to ignore errors).
```

To add a tag instead, make the `update` value a list: `tags: [public]`.

If an action's target matches nothing, the action changes nothing and isn't reported.
If an overlay seems to have no effect, run `redocly bundle` without it and check that the targets match the output.

To check that an overlay file itself is valid, lint it with `redocly lint`.
See [Lint Overlay with Redocly CLI](./lint-overlay.md).

## Resources

- The [`bundle` command](../commands/bundle.md#apply-overlays) reference describes how overlays work with the other bundle options.
- The [`apis` configuration](../configuration/reference/apis.md) reference lists the `overlays` option.
- The [Overlay Specification](https://spec.openapis.org/overlay/latest.html) has more examples of actions.
