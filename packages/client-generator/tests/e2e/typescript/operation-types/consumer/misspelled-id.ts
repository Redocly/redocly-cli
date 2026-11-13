import { use } from './client.ts';

use({
  onRequest: (ctx) => {
    if (ctx.operation.id === 'listPetss') {
      // tsc must reject this comparison: 'listPetss' is not an operationId.
    }
  },
});
