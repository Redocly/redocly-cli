import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
import { yellow, red, green, gray } from 'colorette';
import { RegistryApi } from './registry-api';

const TOKEN_FILENAME = '.redocly-config.json';

export class RedoclyClient {
  private accessToken: string | undefined;
  registryApi: RegistryApi;

  constructor() {
    this.loadToken();
    this.registryApi = new RegistryApi(this.accessToken);
  }

  hasToken(): boolean {
    return !!this.accessToken;
  }

  loadToken(): void {
    if (process.env.REDOCLY_AUTHORIZATION) {
      this.accessToken = process.env.REDOCLY_AUTHORIZATION;
      return;
    }

    const credentialsPath = resolve(homedir(), TOKEN_FILENAME);
    if (existsSync(credentialsPath)) {
      const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
      this.accessToken = credentials && credentials.token;
    }
  }

  async isAuthorizedWithRedocly(): Promise<boolean> {
    return this.hasToken() && !!(await this.getAuthorizationHeader());
  }

  async verifyToken(accessToken: string, verbose: boolean = false): Promise<boolean> {
    if (!accessToken) return false;

    return this.registryApi.setAccessToken(accessToken).authStatus(verbose);
  }

  async getAuthorizationHeader(): Promise<string | undefined> {
    // print this only if there is token but invalid
    if (this.accessToken && !(await this.verifyToken(this.accessToken))) {
      process.stderr.write(
        `${yellow(
          'Warning:',
        )} invalid Redocly API key. Use "npx @redocly/openapi-cli login" to provide your API key\n`,
      );
      return undefined;
    }
    return this.accessToken;
  }

  async login(accessToken: string, verbose: boolean = false) {
    const credentialsPath = resolve(homedir(), TOKEN_FILENAME);
    process.stdout.write(gray('\n  Logging in...\n'));

    const authorized = await this.verifyToken(accessToken, verbose);

    if (!authorized) {
      process.stdout.write(
        red('Authorization failed. Please check if you entered a valid API key.\n'),
      );
      process.exit(1);
    }

    this.accessToken = accessToken;
    const credentials = {
      token: accessToken,
    };

    writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
    process.stdout.write(green('  Authorization confirmed. ✅\n\n'));
  }

  logout(): void {
    const credentialsPath = resolve(homedir(), TOKEN_FILENAME);
    if (existsSync(credentialsPath)) {
      unlinkSync(credentialsPath);
    }
    process.stdout.write('Logged out from the Redocly account. ✋\n');
  }
}

export function isRedoclyRegistryURL(link: string): boolean {
  const domain = process.env.REDOCLY_DOMAIN || 'redoc.ly';
  if (!link.startsWith(`https://api.${domain}/registry/`)) return false;
  const registryPath = link.replace(`https://api.${domain}/registry/`, '');

  const pathParts = registryPath.split('/');

  // we can be sure, that there is job UUID present
  // (org, definition, version, bundle, branch, job, "openapi.yaml" 🤦‍♂️)
  // so skip this link.
  // FIXME
  if (pathParts.length === 7) return false;

  return true;
}
