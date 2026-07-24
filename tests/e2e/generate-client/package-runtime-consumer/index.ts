import { client, configure_2, createOrder, getOrder, setBearer, streamEvents, use } from './api.js';

async function main(): Promise<void> {
  const middlewareIds: string[] = [];
  use({
    onRequest: (ctx) => {
      middlewareIds.push(ctx.operation.id);
    },
  });
  setBearer('test-token');

  // Flat sugar: positional path value forwarded under the wire name `order-id`.
  const order = await getOrder('o-1', { expand: 'items' });
  // Grouped instance call: the caller uses the wire-name key directly.
  const grouped = await client.getOrder({ 'order-id': 'o-2' });
  const created = await createOrder({ status: 'open' });
  // The op whose id collides with the reserved `configure` member — renamed sugar,
  // while middleware still sees the SPEC operationId.
  const collided = await configure_2();

  const events: Array<{ seq: number; text?: string }> = [];
  for await (const event of streamEvents()) {
    events.push({ seq: event.data.seq, text: event.data.text });
  }

  // Compile-time checks: the generated types flow through the package runtime.
  const _orderId: string = order.id;
  const _createdStatus: string = created.status;
  const _collided: string = collided;
  void _orderId;
  void _createdStatus;
  void _collided;

  process.stdout.write(
    JSON.stringify({ order, grouped, created, collided, events, middlewareIds }) + '\n'
  );
}

main().catch((error) => {
  process.stderr.write(`UNHANDLED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
