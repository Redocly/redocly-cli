import { defineClientSetup, type RequestContext } from '@redocly/client-generator';

export default defineClientSetup({
  config: { serverUrl: 'https://baked.example.com' },
  middleware: [
    {
      onRequest: (ctx: RequestContext) => {
        ctx.headers['X-Baked'] = 'yes';
      },
    },
  ],
});
