import {
  ApiError,
  createOrder,
  deleteMenuItem,
  deleteOrder,
  getMenuItemPhoto,
  getOrderById,
  getRevenue,
  listMenuItems,
  listOrderItems,
  listOrders,
  registerOAuth2Client,
  setApiKey,
  setBearer,
  updateOrder,
  createMenuItem,
  isBeverage,
  isDessert,
  OrderStatus,
} from './api.js';

type StepResult =
  | { kind: 'ok'; name: string; data: unknown }
  | { kind: 'err'; name: string; error: string };

async function step(name: string, run: () => Promise<unknown>): Promise<StepResult> {
  try {
    const data = await run();
    return { kind: 'ok', name, data };
  } catch (error) {
    return {
      kind: 'err',
      name,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }
}

async function main(): Promise<void> {
  const results: StepResult[] = [];

  // Set credentials once. Every OAuth2/bearer operation now sends
  // `Authorization: Bearer <token>`, and every ApiKey operation sends the
  // `X-API-Key` header. Operations declared `security: []` send neither.
  setBearer('test-bearer-token');
  setApiKey('test-api-key');

  results.push(
    await step('listMenuItems', () =>
      listMenuItems({ after: 'cursor1', limit: 5, sort: '-name', search: 'coffee' })
    )
  );

  results.push(
    await step('createMenuItem', () => {
      const form = new FormData();
      form.append('name', 'Latte');
      form.append('price', '400');
      form.append('category', 'beverage');
      form.append('volume', '250');
      form.append('containsCaffeine', 'true');
      return createMenuItem(form);
    })
  );

  results.push(
    await step('deleteMenuItem', () => deleteMenuItem('prd_01h1s5z6vf2mm1mz3hevnn9va7'))
  );

  results.push(
    await step('getMenuItemPhoto', async () => {
      const result = await getMenuItemPhoto('prd_01h1s5z6vf2mm1mz3hevnn9va7', {
        photoSize: 'medium',
      });
      if (result instanceof Blob) {
        return { kind: 'blob', size: result.size, type: result.type };
      }
      return { kind: 'text', value: result };
    })
  );

  results.push(await step('listOrders', () => listOrders({ filter: 'status:placed', limit: 5 })));

  results.push(
    await step('createOrder', () =>
      createOrder({
        customerName: 'Ada Lovelace',
        orderItems: [{ menuItemId: 'prd_01h1s5z6vf2mm1mz3hevnn9va7', quantity: 2 }],
      })
    )
  );

  results.push(
    await step('getOrderById', () =>
      getOrderById('ord_01h1s5z6vf2mm1mz3hevnn9va7', {
        'X-Request-Id': '11111111-2222-3333-4444-555555555555',
      })
    )
  );

  results.push(
    await step('updateOrder', () =>
      updateOrder('ord_01h1s5z6vf2mm1mz3hevnn9va7', { status: OrderStatus.completed })
    )
  );

  results.push(await step('deleteOrder', () => deleteOrder('ord_01h1s5z6vf2mm1mz3hevnn9va7')));

  results.push(
    await step('listOrderItems', () =>
      listOrderItems({ filter: 'orderId:ord_01h1s5z6vf2mm1mz3hevnn9va7' })
    )
  );

  results.push(
    await step('getRevenue', () => getRevenue({ startDate: '2026-01-01', endDate: '2026-01-31' }))
  );

  results.push(
    await step('registerOAuth2Client', () =>
      registerOAuth2Client({
        name: 'demo-client',
        scopes: ['menu:read', 'orders:read'],
        grantTypes: ['client_credentials'],
      })
    )
  );

  // Narrow a MenuItem from a real server response with the discriminated-union
  // type guards and confirm they agree with the raw discriminant.
  results.push(
    await step('menuItemGuards', async () => {
      const list = await listMenuItems({});
      const item = list.items[0];
      const category = (item as { category?: string }).category;
      const beverage = isBeverage(item);
      const dessert = isDessert(item);
      return {
        category,
        isBeverage: beverage,
        isDessert: dessert,
        // Guards must agree with the actual discriminant, and exactly one holds.
        agree: beverage === (category === 'beverage') && dessert === (category === 'dessert'),
        exclusive: beverage !== dessert,
      };
    })
  );

  // Negative: error path returns ApiError.
  results.push(
    await step('error-path', async () => {
      try {
        await fetch('http://127.0.0.1:0/'); // Trigger fetch failure type.
      } catch {
        /* no-op */
      }
      try {
        // Hit /__test__/boom by reaching through the generated runtime indirectly:
        // we don't have a generated function for it, so we use the public ApiError shape via a raw fetch.
        const response = await fetch(
          `${process.env.CAFE_BASE ?? 'http://127.0.0.1:3101'}/__test__/boom`
        );
        if (!response.ok) {
          throw new ApiError(
            response.url,
            response.status,
            response.statusText,
            await response.json()
          );
        }
        return { unreachable: true };
      } catch (error) {
        if (error instanceof ApiError) {
          return { apiError: true, status: error.status, statusText: error.statusText };
        }
        throw error;
      }
    })
  );

  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
}

main().catch((error) => {
  process.stderr.write(`UNHANDLED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
