import { Region, RedoclyClient } from '@redocly/openapi-core';
import { blue, green, gray } from 'colorette';
import { loadConfigAndHandleErrors, promptUser } from '../utils';

export function promptClientToken(domain: string) {
  return promptUser(
    green(
      `\n  🔑 Copy your API key from ${blue(`https://app.${domain}/profile`)} and paste it below`
    ),
    true
  );
}

export async function handleLogin(argv: { verbose?: boolean; region?: Region }) {
  const region = argv.region || (await loadConfigAndHandleErrors()).region;
  const client = new RedoclyClient(region);
  const clientToken = await promptClientToken(client.domain);
  process.stdout.write(gray('\n  Logging in...\n'));
  await client.login(clientToken, argv.verbose);
  process.stdout.write(green('  Authorization confirmed. ✅\n\n'));
}
