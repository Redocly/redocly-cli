import { setupServer } from 'msw/node';

import { handlers } from './client.mocks.ts';
import { configure, getPetById } from './client.ts';

const server = setupServer(...handlers);
server.listen({ onUnhandledRequest: 'error' });
configure({ serverUrl: 'https://api.example.com' });
try {
  const pet = await getPetById({ path: { id: 1 } });
  process.stdout.write(JSON.stringify({ ok: pet !== undefined, id: pet.id, name: pet.name }));
} finally {
  server.close();
}
