import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
import { red, green, gray } from 'colorette';
import { RegistryApi } from './registry-api';
import { DOMAINS, Region } from '../config/config';

const TOKEN_FILENAME = '.redocly-config.json';
const DEFAULT_REGION = 'us';
const DEFAULT_DOMAIN = 'redoc.ly';

export class RedoclyClient {
  private accessTokens: { us?: string; eu?: string; } | undefined;
  private domain: string | undefined;
  private region: Region;
  registryApi: RegistryApi;

  constructor(region?: Region) {
    this.region = region || DEFAULT_REGION;
    this.loadTokens();
    this.setDomain(region);
    this.registryApi = new RegistryApi(this.getTokenByRegion(), this.domain);
  }

  getTokenByRegion() {
    return this.accessTokens && this.accessTokens[this.region];
  }

  setDomain(region?: Region) {
    this.domain = region
      ? DOMAINS[region]
      : process.env.REDOCLY_DOMAIN || DOMAINS[DEFAULT_REGION];
  }

  getDomain() {
    return this.domain || DEFAULT_DOMAIN;
  }

  hasTokens(): boolean {
    return !!this.accessTokens;
  }

  loadTokens(): void {
    if (process.env.REDOCLY_AUTHORIZATION) {
      this.accessTokens = {};
      for (const domain in DOMAINS) {
        this.accessTokens[domain as Region] = process.env.REDOCLY_AUTHORIZATION;
      }
      return;
    }
    const credentialsPath = resolve(homedir(), TOKEN_FILENAME);
    if (existsSync(credentialsPath)) {
      this.accessTokens = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
    }
  }

  async getValidTokens() {
    return (await Promise.all(
      Object.entries(this.accessTokens!).map(async ([key, value]) => {
        return { region: key, token: value, valid: await this.verifyToken(value) }
      })
    )).filter(item => Boolean(item.valid));
  }

  async getTokens() {
    return this.hasTokens() ? await this.getValidTokens() : [];
  }

  async isAuthorizedWithRedocly(): Promise<boolean> {
    return this.hasTokens() && !!(await this.getValidTokens()).length;
  }

  async verifyToken(accessToken: string, verbose: boolean = false): Promise<boolean> {
    if (!accessToken) return false;
    return this.registryApi.authStatus(accessToken, verbose);
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

    this.accessTokens = { [this.region]: accessToken };
    const credentials = {
      ...(existsSync(credentialsPath) && JSON.parse(readFileSync(credentialsPath, 'utf-8'))),
      [this.region!]: accessToken,
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
  const domain = process.env.REDOCLY_DOMAIN || DEFAULT_DOMAIN;
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
