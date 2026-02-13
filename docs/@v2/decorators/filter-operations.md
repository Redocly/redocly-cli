# filter-operations

Keeps only operations where a specified property matches any of the provided values.
All other operations are removed from the API description.

## API design principles

This decorator is useful when you want to publish only a subset of your operations based on specific criteria.

## Configuration

| Option   | Type                          | Description                                                                                                          |
| -------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| property | string                        | **REQUIRED.** The operation property name to filter by.                                                              |
| values   | [string \| number \| boolean] | **REQUIRED.** Array of values to match. Operations are kept if their property value matches any value in this array. |

### How matching works

If the operation's property is a single value, it must match one of the values in the array.
If the operation's property is an array (like `tags`), the operation is kept if any item in the property array matches any value in the `values` array.
The filter only applies to first-level operation properties that are either primitive types or arrays of primitives.
If there is no such property, the entire operation is removed from the resulting API description.

{% admonition type="info" %}
To remove additional remnants from components, use the `--remove-unused-components` CLI argument or the corresponding decorator.
{% /admonition %}

### Difference from filter-in

While both decorators filter API content, they work at different levels.
**filter-operations** specifically targets operations (HTTP methods like GET, POST, etc.) within paths, while **filter-in** works on any element throughout the API description (paths, parameters, schemas, responses, etc.).
**filter-in** is a more general-purpose filtering tool, but it might affect other document nodes unintentionally (e.g., when filtering by `tags`, you can also affect schemas with the property `tags`).
Also, unlike **filter-operations**, **filter-in** keeps the node if it lacks the property being filtered.

## Examples

### Filter by custom property

In your OpenAPI description:

```yaml
openapi: 3.0.0
paths:
  /users:
    get:
      x-public: true
      summary: List public users
    post:
      x-public: false
      summary: Create user (internal only)
  /admin:
    get:
      summary: Admin operation (no x-public property)
```

Configure the decorator to keep only operations where `x-public` is `true`:

```yaml
decorators:
  filter-operations:
    property: x-public
    values: [true]
```

Apply the decorator using the `bundle` command:

```bash
redocly bundle openapi.yaml -o public-api.yaml
```

The resulting API description only contains the `/users` GET operation, as it's the only one with `x-public: true`.
The POST operation on `/users` (where `x-public: false`) and the `/admin` GET operation (which lacks the property) are removed.

### Filter by tags

In your OpenAPI description:

```yaml
openapi: 3.0.0
paths:
  /users:
    get:
      tags: [public, users]
      summary: List users
    post:
      tags: [internal, users]
      summary: Create user
  /products:
    get:
      tags: [public, products]
      summary: List products
```

Configure the decorator:

```yaml
decorators:
  filter-operations:
    property: tags
    values: [public]
```

The result includes both GET operations (on `/users` and `/products`) because they both have `public` in their tags array.
The POST operation on `/users` is removed because its tags array doesn't contain `public`.

### Filter by operationId

You can also filter operations by explicitly listing specific property values, such as `operationId`:

```yaml
decorators:
  filter-operations:
    property: operationId
    values:
      - getUsers
      - getProducts
      - updateUser
```

## Related decorators

- [filter-in](./filter-in.md) - Filters paths and other elements by property values
- [filter-out](./filter-out.md) - Removes elements matching property values
- [remove-x-internal](./remove-x-internal.md) - Removes items marked as internal

## Resources

- [Decorator source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/decorators/common/filters/filter-operations.ts)
