import { Region, RedoclyClient, Config } from '@redocly/openapi-core';
import { blue, green, gray } from 'colorette';
import { promptUser } from '../utils';

export function promptClientToken(domain: string) {
  return promptUser(
    green(
      `\n  🔑 Copy your API key from ${blue(`https://app.${domain}/profile`)} and paste it below`
    ),
    true
  );
}

export type LoginOptions = {
  verbose?: boolean;
  region?: Region;
  config?: string;
};

export async function handleLogin(argv: LoginOptions, config: Config) {
  const region = argv.region || config.region;
  const client = new RedoclyClient(region);
  const clientToken = await promptClientToken(client.domain);
  process.stdout.write(gray('\n  Logging in...\n'));
  await client.login(clientToken, argv.verbose);
  process.stdout.write(green('  Authorization confirmed. ✅\n\n'));
}
