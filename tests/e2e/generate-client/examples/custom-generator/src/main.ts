// Consumes both the built-in sdk client and the custom generator's output (`routes`),
// proving the plugin's file is generated alongside the client and type-checks.
import { configure, listMenuItems } from './api/client.js';
import { routes } from './api/client.routes.js';

configure({ serverUrl: 'https://api.cafe.redocly.com' });

const out = document.querySelector<HTMLPreElement>('#out')!;

async function main() {
  // The route map the custom generator produced from the same OpenAPI description.
  const menu = await listMenuItems();
  out.textContent = `${routes.listMenuItems}\n${JSON.stringify(menu, null, 2)}`;
}

void main();
