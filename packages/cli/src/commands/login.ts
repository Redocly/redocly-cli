import { Region } from '@redocly/openapi-core/lib/config/config';
import { loadConfig, RedoclyClient } from '@redocly/openapi-core';
import { promptUser } from '../utils';
import { blue, green } from 'colorette';

export async function handleLogin(
  argv: {
    verbose?: boolean,
    region?: Region,
  }
) {
  const { redoclyDomain } = await loadConfig({ region: argv.region });
  const clientToken = await promptUser(
    green(
      `\n  🔑 Copy your API key from ${blue(
        `https://app.${redoclyDomain}/profile`,
      )} and paste it below`,
    ),
    true,
  );
  const client = new RedoclyClient(redoclyDomain);
  client.login(clientToken, argv.verbose);
}
