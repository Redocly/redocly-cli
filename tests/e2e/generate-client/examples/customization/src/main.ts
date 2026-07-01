import {
  configure,
  use,
  listMenuItems,
  listOrders,
  createOrder,
  type RequestContext,
} from './api/client.js';

// `ctx.operation.{id,path,tags}` are typed literal unions (OperationId / OperationPath / OperationTag),
// so the `id`/`tag` comparisons below autocomplete and a typo is a compile error — not a silent miss.

const out = document.querySelector<HTMLPreElement>('#out')!;
const log: string[] = [];

// 1. Custom transport: a canned `fetch` so this example runs offline (and avoids the CORS
//    preflight a browser triggers for custom request headers against the live API).
configure({
  fetch: (async (_url: string, init: RequestInit) => {
    const isPost = init.method === 'POST';
    const payload = isPost
      ? { id: 'ord_demo', object: 'order', status: 'created', ...JSON.parse(String(init.body)) }
      : { data: [{ id: 'prd_1', object: 'menuItem', name: 'Espresso', price: 300 }] };
    return new Response(JSON.stringify(payload), {
      status: isPost ? 201 : 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch,
});

// 2. Operation-targeted middleware — match by operation identity (id or tag), not brittle URL regex.
// 3. Request-body mutation — `onRequest` may now edit `ctx.body`, and the change is sent.
// 4. Raw-Response handling — `onResponse` observes (or could replace) the Response before parsing.
use({
  onRequest: (ctx: RequestContext) => {
    if (ctx.operation.id === 'listMenuItems' || ctx.operation.tags.includes('Products')) {
      ctx.headers['X-Trace-Id'] = 'demo-trace';
    }
    if (ctx.operation.id === 'createOrder') {
      (ctx.body as { source?: string }).source = 'web';
    }
    // `[traced]` marks requests the guard above actually touched — untargeted operations show none.
    const traced = 'X-Trace-Id' in ctx.headers ? ' [traced]' : '';
    log.push(`-> ${ctx.operation.id} ${ctx.method} ${ctx.operation.path}${traced}`);
  },
  onResponse: (response) => {
    log.push(`<- ${response.status}`);
  },
});

async function main() {
  // 5. Per-call header via the trailing `RequestOptions` argument.
  const menu = await listMenuItems({}, { headers: { 'X-Request-Id': '42' } });
  const order = await createOrder({
    customerName: 'Mary Ann',
    orderItems: [{ menuItemId: 'prd_1', quantity: 2 }],
  });
  // An untargeted operation (not `listMenuItems`/`Products`, not `createOrder`): the middleware
  // only observes it — no header is added and the body is left as-is. It shows no `[traced]` mark.
  const orders = await listOrders();
  out.textContent = [...log, '', JSON.stringify({ menu, order, orders }, null, 2)].join('\n');
}

void main();
