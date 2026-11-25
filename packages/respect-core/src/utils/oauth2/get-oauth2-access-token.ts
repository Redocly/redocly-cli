import {
  describeOAuth2ValueOptions,
  getOAuth2ValueOptions,
  isPlainObject,
  isString,
  type OAuth2Auth,
} from '@redocly/openapi-core';

import {
  findPotentiallySecretObjectFields,
  POTENTIALLY_SECRET_FIELDS,
} from '../../modules/logger-output/mask-secrets.js';
import type { TestContext } from '../../types.js';
import { isJSON } from '../is-json.js';

const GRANT_TYPES = {
  password: 'password',
  clientCredentials: 'client_credentials',
} as const;

// A cached token is not reused this close to its expiration, so it is still valid when the API reads it.
const EXPIRATION_MARGIN_MS = 10_000;

export async function getOAuth2AccessToken({
  ctx,
  scheme,
  values,
  serverUrl,
}: {
  ctx: TestContext;
  scheme: OAuth2Auth;
  values: Record<string, string>;
  serverUrl?: string;
}): Promise<string> {
  const valueOptions = getOAuth2ValueOptions(scheme);
  // The keys choose the option, the same way as in the `x-security-scheme-required-values` rule,
  // so an empty value is an error and not a reason to try the next option.
  const valueOption = valueOptions.find(({ requiredValues }) =>
    requiredValues.every((requiredValue) => requiredValue in values)
  );

  if (!valueOption) {
    throw new Error(
      `Missing required values for oauth2 security scheme: ${describeOAuth2ValueOptions(valueOptions)}`
    );
  }

  const emptyValue = valueOption.requiredValues.find((requiredValue) => !values[requiredValue]);

  if (emptyValue) {
    throw new Error(`Missing required value \`${emptyValue}\` for oauth2 security scheme`);
  }
  if (!valueOption.flow) {
    return values.accessToken;
  }

  const flowTokenUrl = scheme.flows[valueOption.flow]?.tokenUrl;

  // OpenAPI lets `tokenUrl` be a relative reference, which is resolved against the server URL.
  if (!flowTokenUrl || !URL.canParse(flowTokenUrl, serverUrl)) {
    throw new Error(
      `Missing or invalid \`tokenUrl\` in the ${valueOption.flow} flow of the oauth2 security scheme`
    );
  }

  const tokenUrl = new URL(flowTokenUrl, serverUrl).href;

  const cacheKey = JSON.stringify([tokenUrl, valueOption.flow, values]);
  const cachedToken = ctx.oauth2TokenCache.get(cacheKey);

  if (cachedToken && cachedToken.expiresAt - EXPIRATION_MARGIN_MS > Date.now()) {
    return cachedToken.accessToken;
  }

  const { clientId, clientSecret, username, password, scope } = values;
  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
  };
  const body = new URLSearchParams({ grant_type: GRANT_TYPES[valueOption.flow] });

  if (valueOption.flow === 'password') {
    body.set('username', username);
    body.set('password', password);
    // The token request is in the HAR output, so what it sends and receives is masked there.
    // YAML can give the password as a number, and the secrets are strings.
    ctx.secretsSet.add(String(password));
  }
  if (scope) {
    body.set('scope', scope);
  }
  if (clientId && clientSecret) {
    // RFC 6749, section 2.3.1: the client ID and secret are form-urlencoded before the Basic encoding.
    // The only `=` left in the encoded pair is the separator.
    const credentials = btoa(
      new URLSearchParams({ [clientId]: clientSecret }).toString().replace('=', ':')
    );
    ctx.secretsSet.add(credentials);
    ctx.secretsSet.add(String(clientSecret));
    headers.authorization = `Basic ${credentials}`;
  } else if (clientId) {
    // RFC 6749, section 3.2.1: a client without a secret only identifies itself.
    body.set('client_id', clientId);
  }

  const response = await ctx.options
    .fetch(tokenUrl, {
      method: 'POST',
      headers,
      body: body.toString(),
      // A redirect would send the credentials to another address.
      redirect: 'error',
      signal: AbortSignal.timeout(ctx.options.maxFetchTimeout),
    })
    .catch((error: Error) => {
      // The `fetch` of Node.js reports only "fetch failed" and keeps the reason in the cause.
      const reason = error.cause instanceof Error ? error.cause.message : error.message;

      throw new Error(`The OAuth2 token request to ${tokenUrl} failed: ${reason}`);
    });
  const responseText = await response.text();
  const parsedResponse: unknown = isJSON(responseText) ? JSON.parse(responseText) : undefined;
  const tokenResponse: Record<string, unknown> = isPlainObject(parsedResponse)
    ? parsedResponse
    : {};

  for (const secret of findPotentiallySecretObjectFields(tokenResponse, [
    ...POTENTIALLY_SECRET_FIELDS,
    'refresh_token',
  ])) {
    ctx.secretsSet.add(secret);
  }

  if (!response.ok) {
    // RFC 6749, section 5.2: an error response names the error and can describe it.
    const reason = [tokenResponse.error, tokenResponse.error_description]
      .filter(isString)
      .join(': ');

    throw new Error(
      `The OAuth2 token request to ${tokenUrl} failed with status ${response.status}${reason ? ` (${reason})` : ''}.`
    );
  }

  const { access_token: accessToken, token_type: tokenType, expires_in: expiresIn } = tokenResponse;

  if (!isString(accessToken) || !accessToken) {
    throw new Error(`The OAuth2 token response from ${tokenUrl} has no \`access_token\`.`);
  }
  // RFC 6749, section 7.1: a client must not use a token of a type it does not understand.
  if (isString(tokenType) && tokenType.toLowerCase() !== 'bearer') {
    throw new Error(
      `The OAuth2 token response from ${tokenUrl} has the token type \`${tokenType}\`, but Respect supports only \`Bearer\`.`
    );
  }

  ctx.oauth2TokenCache.set(cacheKey, {
    accessToken,
    // A token without `expires_in` is reused until the end of the run.
    expiresAt: expiresIn === undefined ? Infinity : Date.now() + Number(expiresIn) * 1000,
  });

  return accessToken;
}
