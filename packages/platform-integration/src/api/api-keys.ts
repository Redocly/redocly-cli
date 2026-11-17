export function getApiKeys() {
  if (process.env.REDOCLY_AUTHORIZATION) {
    return process.env.REDOCLY_AUTHORIZATION;
  }

  throw new Error('No api key provided, please use environment variable REDOCLY_AUTHORIZATION.');
}
