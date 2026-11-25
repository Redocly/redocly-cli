import { logger } from '@redocly/openapi-core';
import { getPlatformCredentials, isValidPlatformUrl } from '@redocly/platform-integration';

import { notLoggedInMessage } from './utils.js';

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

  const credentials = await getPlatformCredentials(platformUrl, version);

  if (!credentials) {
    logger.error(`${notLoggedInMessage(platformUrl)}\n`);
    return 'quit=1\n';
  }

  const password = 'apiKey' in credentials ? credentials.apiKey : credentials.accessToken;

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
