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
  private region: Region;
  domain: string;
  registryApi: RegistryApi;

  constructor(region?: Region) {
    this.region = this.loadRegion(region);
    this.loadTokens();
    this.domain = region
      ? DOMAINS[region]
      : process.env.REDOCLY_DOMAIN || DEFAULT_DOMAIN;
    this.registryApi = new RegistryApi(this.getTokenByRegion(), this.domain);
  }

  loadRegion(region?: Region) {
    if (region && !DOMAINS[region]) {
      process.stdout.write(
        red(`Invalid argument: region in config file.\nGiven: ${green(region)}, choices: "us", "eu".\n`),
      );
      process.exit(1);
    }
    return region || DEFAULT_REGION;
  }

  getTokenByRegion() {
    return this.accessTokens && this.accessTokens[this.region];
  }

  hasTokens(): boolean {
    return !!this.accessTokens;
  }

  loadTokens(): void {
    const credentialsPath = resolve(homedir(), TOKEN_FILENAME);
    const credentials = this.readCredentialsFile(credentialsPath);
    if (Object.keys(credentials).length > 0) {
      this.accessTokens = {
        ...this.accessTokens,
        ...(credentials.token && !credentials[this.region] && {
          [this.region]: credentials.token
        })
      }
    }
    if (process.env.REDOCLY_AUTHORIZATION) {
      this.accessTokens = {
        ...this.accessTokens,
        [this.region]: process.env.REDOCLY_AUTHORIZATION
      }
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

  readCredentialsFile(credentialsPath: string) {
    return existsSync(credentialsPath) ? JSON.parse(readFileSync(credentialsPath, 'utf-8')) : {};
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

    const credentials = {
      ...this.readCredentialsFile(credentialsPath),
      [this.region!]: accessToken,
    };
    this.accessTokens = credentials;
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
