import { defineClientSetup, type RequestContext } from '@redocly/client-generator';

// Defaults every downstream user of this SDK gets for free — baked into the client at publish time
// by `setup:` in redocly.yaml. Imports the contract from the package (not the generated client),
// so this file resolves and is unit-testable before the client even exists.
export default defineClientSetup({
  config: { baseUrl: 'https://api.cafe.redocly.com', retry: { retries: 2 } },
  middleware: [
    {
      onRequest: (ctx: RequestContext) => {
        ctx.headers['X-Cafe-SDK'] = '1.0.0';
        if (ctx.operation.tags.includes('Orders')) {
          ctx.headers['X-Idempotency-Key'] = crypto.randomUUID();
        }
      },
    },
  ],
});
