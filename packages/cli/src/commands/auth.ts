import { exitWithError } from '../utils/miscellaneous.js';
import { RedoclyOAuthClient } from '../auth/oauth-client.js';
import { getReuniteUrl } from '../reunite/api/index.js';

import type { CommandArgs } from '../wrapper.js';

export type LoginOptions = {
  residency?: string;
  config?: string;
};

export async function handleLogin({ argv, version }: CommandArgs<LoginOptions>) {
  try {
    const reuniteUrl = getReuniteUrl(argv.residency);
    const oauthClient = new RedoclyOAuthClient('redocly-cli', version);
    await oauthClient.login(reuniteUrl);
  } catch {
    if (argv.residency) {
      const reuniteUrl = getReuniteUrl(argv.residency);
      exitWithError(`❌ Connection to ${reuniteUrl} failed.`);
    } else {
      exitWithError(`❌ Login failed. Please check your credentials and try again.`);
    }
  }
}

export type LogoutOptions = {
  config?: string;
};

export async function handleLogout({ version }: CommandArgs<LogoutOptions>) {
  const oauthClient = new RedoclyOAuthClient('redocly-cli', version);
  oauthClient.logout();

  process.stdout.write('Logged out from the Redocly account. ✋ \n');
}
