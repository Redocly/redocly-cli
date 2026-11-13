// The default handler of a paginated operation serves the last page, so `.pages()` ends
// after one page for the cursor style (listOrders) and the body-link style (listReceipts).
import { setupServer } from 'msw/node';

import { handlers } from './client.mocks.ts';
import { client } from './client.ts';

const server = setupServer(...handlers);
server.listen({ onUnhandledRequest: 'error' });
client.configure({ serverUrl: 'https://api.example.com' });

const pages = { orders: 0, receipts: 0 };
for await (const _page of client.listOrders.pages()) pages.orders++;
for await (const _page of client.listReceipts.pages()) pages.receipts++;
server.close();

process.stdout.write(JSON.stringify(pages));
