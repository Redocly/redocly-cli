# Azure APIM decorator

Authors:

- [`@adamaltman`](https://github.com/adamaltman), Adam Altman (Redocly)

## What this does and why

[Azure APIM](https://learn.microsoft.com/en-us/azure/api-management/api-management-api-import-restrictions) doesn't support a variety of OpenAPI features (one of which is examples).
Examples causes an error when attempting to import OpenAPI descriptions that contain examples to Azure APIM.

This decorator removes examples from schemas, media types, and components.

This is a decorator you can run in a pipeline to transform your OpenAPI description prior to uploading to Azure APIM.
Note that Azure APIM has many restrictions, and it might require more transformation prior to uploading to Azure APIM.

You certainly would want to have the examples for purposes of documentation. Redocly renders multiple media type examples beautifully.

Contribute to this community cookbook by adding decorators for issues you find with your imports to Azure APIM.

## Code

The code is entirely in [azure-apim.js](./azure-apim.js).

The code sets the plugin name to `azure-apim` and adds a decorator named `remove-examples`.

It operates on the `Schemas`, `MediaType`, and `Components` element (in OpenAPI 3.x descriptions) to remove the `examples` node.

## Examples

Add the plugin to `redocly.yaml` and enable the decorator:

```yaml
plugins:
  - ./azure-apim.js

decorators:
  azure-apim/remove-examples: on
```

Here is an example of an operation before and after:

**Before**:

```yaml
/orders:
  get:
    summary: List orders
    operationId: listOrders
    description: Retrieves collection of orders.
    responses:
      '200':
        description: Orders retrieved.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderList'
            examples:
              order-list:
                $ref: '#/components/examples/OrderList'
      '401':
        $ref: '#/components/responses/Unauthorized'
      '403':
        $ref: '#/components/responses/Forbidden'
      '404':
        $ref: '#/components/responses/NotFound'
```

**After**:

```yaml
/orders:
  get:
    summary: List orders
    operationId: listOrders
    description: Retrieves collection of orders.
    responses:
      '200':
        description: Orders retrieved.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderList'
      '401':
        $ref: '#/components/responses/Unauthorized'
      '403':
        $ref: '#/components/responses/Forbidden'
      '404':
        $ref: '#/components/responses/NotFound'
```

🎉 Notice `examples` is removed from the `application/json` media type.

## References

- https://learn.microsoft.com/en-us/azure/api-management/api-management-api-import-restrictions
- OpenAPI [node types](https://redocly.com/docs/openapi-visual-reference/openapi-node-types/)
