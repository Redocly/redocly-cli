import type { OAuth2Auth } from '../typings/openapi.js';

export type OAuth2ValueOption = {
  // The flow that exchanges the values for an access token; not set when the values hold the token itself.
  flow?: 'password' | 'clientCredentials';
  requiredValues: string[];
};

// The sets of `x-security` values an OAuth2 scheme accepts: the access token itself,
// or the credentials of a declared flow that needs only the token endpoint.
// The first option with all its values present is the one to use.
export function getOAuth2ValueOptions(scheme: OAuth2Auth): OAuth2ValueOption[] {
  const options: OAuth2ValueOption[] = [{ requiredValues: ['accessToken'] }];

  if (scheme.flows?.password) {
    options.push({ flow: 'password', requiredValues: ['username', 'password'] });
  }
  if (scheme.flows?.clientCredentials) {
    options.push({ flow: 'clientCredentials', requiredValues: ['clientId', 'clientSecret'] });
  }

  return options;
}

export function describeOAuth2ValueOptions(options: OAuth2ValueOption[]): string {
  return options
    .map(
      ({ flow, requiredValues }) =>
        requiredValues.map((requiredValue) => `\`${requiredValue}\``).join(' and ') +
        (flow ? ` for the ${flow} flow` : '')
    )
    .join(', or ');
}
