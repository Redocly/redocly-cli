// Consumes the sdk client alongside the custom generator's `ResponseShapes` map —
// the annotation below only compiles because the map's entry IS the type
// `listMenuItems()` resolves to, proving the AST-built output stays in sync with the client.
import { configure, listMenuItems } from './api/client.js';
import type { ResponseShapes } from './api/client.responses.js';

configure({ serverUrl: 'https://api.cafe.redocly.com' });

const menu: ResponseShapes['listMenuItems'] = await listMenuItems();
console.log(menu.items.map((item) => item.name));
