import { use, type RequestContext } from './client.ts';

use({
  onRequest: (ctx) => {
    if (ctx.operation.id === 'listPets' || ctx.operation.path === '/pets') {
      // A known operationId and path compile.
    }
  },
});
// Middleware typed with the base RequestContext stays accepted.
use({
  onRequest: (ctx: RequestContext) => {
    ctx.headers['X-Op'] = ctx.operation.id;
  },
});
