import { api } from './api/client.facade.js';
// nested-facade — a resource-grouped client shape, generated from the spec's tags.
//
// The generated sdk exposes flat functions and the `client` instance; some teams
// prefer `api.<resource>.<operation>(…)`. Instead of hand-maintaining that facade,
// the custom generator in ./nested-facade-generator.mjs derives it from the spec's
// tags — every regeneration keeps it in sync, and everything stays fully typed.
import { configure } from './api/client.js';

// A canned transport so the example runs offline.
const CANNED: Record<string, unknown> = {
  '/orders': [{ id: 'ord-101', drink: 'espresso' }],
  '/menu': [{ name: 'latte', price: 450 }],
};
const canned = (async (url: string) =>
  new Response(JSON.stringify(CANNED[new URL(url).pathname]), {
    headers: { 'content-type': 'application/json' },
  })) as unknown as typeof fetch;

configure({ fetch: canned });

// Nested, resource-first call shape — same typed functions underneath.
for (const order of await api.orders.listOrders()) {
  console.log(`order ${order.id}: ${order.drink}`);
}
for (const item of await api.menu.listMenuItems()) {
  console.log(`menu: ${item.name} — $${(item.price / 100).toFixed(2)}`);
}
