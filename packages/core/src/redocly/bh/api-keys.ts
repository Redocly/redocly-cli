import { resolve } from 'path';
import { homedir } from 'os';
import { isNotEmptyObject } from '../../utils';
import { existsSync, readFileSync } from 'fs';
import { env } from '../../env';

const TOKEN_FILENAME = '.redocly-config.json';

function readCredentialsFile(credentialsPath: string) {
  return existsSync(credentialsPath) ? JSON.parse(readFileSync(credentialsPath, 'utf-8')) : {};
}

export function getApiKeys(domain: string) {
  const credentialsPath = resolve(homedir(), TOKEN_FILENAME);
  const credentials = readCredentialsFile(credentialsPath);

  if (env.REDOCLY_AUTHORIZATION) {
    return env.REDOCLY_AUTHORIZATION;
  }

  if (isNotEmptyObject(credentials) && credentials[domain]) {
    return credentials[domain];
  }

  throw new Error('No api key provided, please use environment variable REDOCLY_DOMAIN.');
}
