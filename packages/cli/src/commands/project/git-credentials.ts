import { logger } from '@redocly/openapi-core';
import { isValidPlatformUrl, RedoclyOAuthClient } from '@redocly/platform-integration';

// Credential helper protocol: https://git-scm.com/docs/gitcredentials
export async function handleProjectGitCredentials({
  operation,
  input,
  version,
}: {
  operation: string;
  input: AsyncIterable<Buffer | string>;
  version: string;
}): Promise<string> {
  const request = await readCredentialRequest(input);
  const platformUrl = `${request.protocol}://${request.host}`;

  if (operation !== 'get' || !isValidPlatformUrl(platformUrl)) {
    return '';
  }

  const password =
    process.env.REDOCLY_AUTHORIZATION ||
    (await new RedoclyOAuthClient(version).getAccessToken(platformUrl));

  if (!password) {
    logger.error(
      `You are not logged in to ${platformUrl}. Run \`redocly login --residency ${platformUrl}\` or set the REDOCLY_AUTHORIZATION environment variable.\n`
    );
    return 'quit=1\n';
  }

  return `username=redocly\npassword=${password}\n`;
}

async function readCredentialRequest(input: AsyncIterable<Buffer | string>) {
  let text = '';
  for await (const chunk of input) {
    text += chunk.toString();
  }

  const request: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const [, key, value] = line.match(/^([^=]+)=(.*)$/) ?? [];
    if (key) {
      request[key] = value;
    }
  }

  return request;
}
