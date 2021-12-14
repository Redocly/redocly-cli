import { Region, RedoclyClient, loadConfig } from '@redocly/openapi-core';
import { blue, green } from 'colorette';
import { promptUser } from '../utils';

export function promptClientToken(domain: string) {
  return promptUser(
    green(
      `\n  🔑 Copy your API key from ${blue(`https://app.${domain}/profile`)} and paste it below`,
    ),
    true,
  );
}

export async function handleLogin(argv: { verbose?: boolean; region?: Region }) {
  const region = argv.region || (await loadConfig()).region;
  const client = new RedoclyClient(region);
  const clientToken = await promptClientToken(client.domain);
  client.login(clientToken, argv.verbose);
}
