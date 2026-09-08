# Move an existing app to a generated client

## Introduction

Most applications already talk to their API through code somebody wrote by hand: a types file, a `fetch` wrapper, and a set of helpers around them.
This guide tells you how to replace that code with a generated client, one API at a time, without a rewrite.

It assumes you have an OpenAPI description of the API.
If the description is out of date, read [Expect the description to be wrong](#expect-the-description-to-be-wrong) first, because that step decides how the rest of the work feels.

## Generate beside your current client

Generate into a new path and change nothing else:

```bash
redocly generate-client openapi.yaml --output src/api/generated/client.ts
```

Your application still runs on the old code.
You now have both, so you can compare them and migrate one call site at a time.

Put the command in your build so the client cannot drift from the description:

```json
{
  "scripts": {
    "generate": "redocly generate-client openapi.yaml -o src/api/generated/client.ts",
    "build": "npm run generate && tsc"
  }
}
```

Commit the generated file.
A reviewer then sees what changed in the API when you regenerate, and the build does not depend on the description being reachable.

## Map your old client onto the new one

The pieces of a hand-written client have direct equivalents:

| What you have now                         | What replaces it                                                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| A types file, generated or hand-written   | The types in the generated client. Every operation carries its own request and response types.                                        |
| A `fetch` wrapper with a base URL         | `configure({ serverUrl })`, or the `servers` entry of the description.                                                                |
| Auth headers added by hand                | `configure({ auth: … })`, or `client.auth.bearer(…)` on one instance. See [Authentication](./use-generated-client.md#authentication). |
| A retry helper                            | `configure({ retry: { retries: 3 } })`. See [Retries](./use-generated-client.md#retries).                                             |
| A hand-rolled pagination loop             | Declared [pagination](./use-generated-client.md#pagination) with the `.pages()` and `.items()` iterators.                             |
| Interceptors for logs, traces, or headers | [Middleware](./use-generated-client.md#middleware), which sees each operation's id and tags as literal types.                         |
| An existing configured request library    | `configure({ fetch })`. See [The HTTP layer](./use-generated-client.md#the-http-layer).                                               |
| Response shapes checked by hand           | The [`zod` generator](./use-generated-client.md#runtime-validation) and its `zodValidation()` middleware.                             |
| Hand-written API mocks in tests           | The [`mock` generator](./use-generated-client.md#generators): MSW handlers and typed data factories.                                  |

Two of those replace whole files rather than lines.
Pagination loops and mock fixtures are usually the largest deletions in a migration of this kind.

## Migrate the call sites

Work per module, not per operation.
For each module, change the imports to the generated client and let the compiler list what breaks:

```ts
// Before
import { getOrder } from '../api/orders';
const order = await getOrder(orderId);

// After
import { getOrderById } from '../api/generated/client.js';
const order = await getOrderById({ path: { orderId } });
```

Three differences account for most of the compiler errors:

- **Operation names come from the description.** The generated name is the `operationId`, so `getOrder` becomes whatever the description calls it.
  If the names read badly, fix them in the description: every consumer improves at once.
- **Inputs are grouped by layer.** Path parameters go in `path`, query parameters in `query`, the body in `body`, and headers in `headers`.
  A call that passes an undeclared key fails with a `TypeError` that names the key, so a wrong call cannot reach the network.
  [`--args-style flat`](../commands/generate-client.md#options) merges the layers into one object instead, which some hand-written wrappers are closer to.
- **Errors are typed.** By default an operation throws `ApiError` on a non-2xx response.
  With [`--error-mode result`](./use-generated-client.md#error-handling) it returns `{ data, error, response }` instead, which is closer to some hand-written wrappers.

## Expect the description to be wrong

A generated client holds your code to the description, so the first run tells you where the two disagree.
This is the useful part of the migration, and it is also the part that surprises people, so plan for it.

Turn on runtime validation early:

```ts
import { use } from './api/generated/client.ts';
import { zodValidation } from './api/generated/client.zod.ts';

use(zodValidation()); // invalid requests throw; response drift warns
```

Requests that do not match the description throw before the network call, and responses that do not match warn by default.
Both point at the field and the operation.

When a check fails, fix the cause rather than the check.
A failure is either a defect in your code or a defect in the description, and disabling validation keeps both.
Correct the description, regenerate, and every consumer of that API gets the correction.

## Migrate the tests too

A generated client that every test mocks away is a generated client that no test exercises.
The `mock` generator emits MSW handlers and typed factories, so a test can run the real client against a fake network:

```ts
import { listOrdersHandler, createOrder } from './api/generated/client.mocks.ts';

server.use(listOrdersHandler({ orders: [createOrder({ id: 'ord_1' })] }));
// the code under test now issues a real request through the real client
```

This moves argument building, URL construction, and response parsing into the test, which is where the migration's remaining defects usually hide.

## Delete the old client

Remove the old module when its last call site is gone, and keep the deletion in its own commit.
The generated client replaces code rather than adding a layer, so the net line count of a migration is usually negative.

## Resources

- [`generate-client` command](../commands/generate-client.md): the flags and the invocation.
- [Use the generated client](./use-generated-client.md): auth, retries, middleware, pagination, and the add-on generators.
- [Customize client generation](./customize-client-generation.md): publisher defaults, custom generators, and ejecting a built-in generator.
- [`client` configuration](../configuration/reference/client.md): the `redocly.yaml` block.
