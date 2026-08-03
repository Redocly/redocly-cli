# custom-pagination

Hand-written paging over the generated client, for shapes the built-in
[`client.pagination` styles](../../../../../docs/@v2/configuration/reference/client.md)
don't cover — here a cursor that travels in the **request body**. There is deliberately
no `client.pagination` block: the generated `searchOrders` call is fully typed, so a
five-line `paginate` helper is all it takes (see `src/main.ts`).

For APIs the declared styles fit, prefer the native `.pages()`/`.items()` iterators —
see the sibling [`pagination`](../pagination) example.

## Run

```bash
npm install
npm run generate
npm start
```
