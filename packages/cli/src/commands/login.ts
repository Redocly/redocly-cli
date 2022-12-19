import { Region, RedoclyClient, loadConfig } from '@redocly/openapi-core';
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

export async function handleLogin(argv: { verbose?: boolean; region?: Region; token?: string }) {
  const region = argv.region || (await loadConfig()).region;
  const client = new RedoclyClient(region);

  let clientToken = argv.token;
  if (!clientToken) {
    clientToken = await promptClientToken(client.domain);
  }
  process.stdout.write(gray('\n  Logging in...\n'));
  await client.login(clientToken, argv.verbose);
  process.stdout.write(green('  Authorization confirmed. ✅\n\n'));
}
