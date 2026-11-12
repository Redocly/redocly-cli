// An override sets the first page only: the empty page after it keeps its empty items, so
// `.items()` yields the override items once and stops.
import { setupServer } from 'msw/node';

import { listMenuItemsHandler } from './client.mocks.ts';
import { client } from './client.ts';

const server = setupServer(listMenuItemsHandler({ items: [{ name: 'Latte' }] }));
server.listen({ onUnhandledRequest: 'error' });
client.configure({ serverUrl: 'https://api.example.com' });

const names: string[] = [];
for await (const item of client.listMenuItems.items()) names.push(item.name);
server.close();

process.stdout.write(JSON.stringify(names));
