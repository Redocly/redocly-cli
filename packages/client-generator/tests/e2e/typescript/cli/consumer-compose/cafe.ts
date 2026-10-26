import type { CustomCommand } from '@redocly/client-generator';

import * as kitchen from './kitchen.client.cli.ts';
import * as shop from './shop.client.cli.ts';
const { runCli } = shop; // the engine is embedded in, and re-exported by, each generated cli module

const login: CustomCommand = {
  name: 'login',
  summary: 'Store a token for both APIs.',
  flags: [{ name: 'user', param: 'user', type: 'string', required: true }],
  handler: (context) => {
    context.wiring.stdout(JSON.stringify({ loggedIn: context.params.user }));
    return 0;
  },
};

process.exit(
  await runCli(
    [
      { commands: [login], wiring: shop.wiring },
      {
        namespace: 'shop',
        commands: shop.COMMANDS,
        wiring: { ...shop.wiring, envPrefix: 'CAFE_SHOP' },
      },
      {
        namespace: 'kitchen',
        commands: kitchen.COMMANDS,
        wiring: { ...kitchen.wiring, envPrefix: 'CAFE_KITCHEN' },
      },
    ],
    process.argv.slice(2)
  )
);
