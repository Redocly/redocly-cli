import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
import { red, green, gray, yellow } from 'colorette';
import { RegistryApi } from './registry-api';
import { DEFAULT_REGION, DOMAINS, AVAILABLE_REGIONS } from '../config/config';
import { RegionalToken, RegionalTokenWithValidity } from './redocly-client-types';
import { isNotEmptyObject } from '../utils';

import type { AccessTokens, Region } from '../config/types';

const TOKEN_FILENAME = '.redocly-config.json';

let REDOCLY_DOMAIN: string; // workaround for the isRedoclyRegistryURL, see more below
export class RedoclyClient {
  private accessTokens: AccessTokens = {};
  private region: Region;
  domain: string;
  registryApi: RegistryApi;

  constructor(region?: Region) {
    this.region = this.loadRegion(region);
    this.loadTokens();
    this.domain = region ? DOMAINS[region] : process.env.REDOCLY_DOMAIN || DOMAINS[DEFAULT_REGION];

    /*
     * We can't use process.env here because it is replaced by a const in some client-side bundles,
     * which breaks assignment.
     */
    REDOCLY_DOMAIN = this.domain; // isRedoclyRegistryURL depends on the value to be set
    this.registryApi = new RegistryApi(this.accessTokens, this.region);
  }

  loadRegion(region?: Region) {
    if (region && !DOMAINS[region]) {
      process.stdout.write(
        red(
          `Invalid argument: region in config file.\nGiven: ${green(
            region,
          )}, choices: "us", "eu".\n`,
        ),
      );
      process.exit(1);
    }

    if (process.env.REDOCLY_DOMAIN) {
      return (AVAILABLE_REGIONS.find(
        (region) => DOMAINS[region as Region] === process.env.REDOCLY_DOMAIN,
      ) || DEFAULT_REGION) as Region;
    }
    return region || DEFAULT_REGION;
  }

  getRegion(): Region {
    return this.region;
  }

  hasTokens(): boolean {
    return isNotEmptyObject(this.accessTokens);
  }

  // <backward compatibility: old versions of portal>
  hasToken() {
    return !!this.accessTokens[this.region];
  }

  async getAuthorizationHeader(): Promise<string | undefined> {
    const token = this.accessTokens[this.region];
    // print this only if there is token but invalid
    if (token && !this.isAuthorizedWithRedoclyByRegion()) {
      process.stderr.write(
        `${yellow(
          'Warning:',
        )} invalid Redocly API key. Use "npx @redocly/openapi-cli login" to provide your API key\n`,
      );
      return undefined;
    }

    return token;
  }
  // </backward compatibility: portal>

  setAccessTokens(accessTokens: AccessTokens) {
    this.accessTokens = accessTokens;
  }

  loadTokens(): void {
    const credentialsPath = resolve(homedir(), TOKEN_FILENAME);
    const credentials = this.readCredentialsFile(credentialsPath);
    if (isNotEmptyObject(credentials)) {
      this.setAccessTokens({
        ...credentials,
        ...(credentials.token &&
          !credentials[this.region] && {
            [this.region]: credentials.token,
          }),
      });
    }
    if (process.env.REDOCLY_AUTHORIZATION) {
      this.setAccessTokens({
        ...this.accessTokens,
        [this.region]: process.env.REDOCLY_AUTHORIZATION,
      });
    }
  }

  getAllTokens(): RegionalToken[] {
    return (<[Region, string][]>Object.entries(this.accessTokens))
      .filter(([region]) => AVAILABLE_REGIONS.includes(region))
      .map(([region, token]) => ({ region, token }));
  }

  async getValidTokens(): Promise<RegionalTokenWithValidity[]> {
    const allTokens = this.getAllTokens();

    const verifiedTokens = await Promise.allSettled(
      allTokens.map(({ token, region }) => this.verifyToken(token, region)),
    );

    return allTokens
      .filter((_, index) => verifiedTokens[index].status === 'fulfilled')
      .map(({ token, region }) => ({ token, region, valid: true }));
  }

  async getTokens() {
    return this.hasTokens() ? await this.getValidTokens() : [];
  }

  async isAuthorizedWithRedoclyByRegion(): Promise<boolean> {
    if (!this.hasTokens()) {
      return false;
    }

    const accessToken = this.accessTokens[this.region];

    if (!accessToken) {
      return false;
    }

    try {
      await this.verifyToken(accessToken, this.region);

      return true;
    } catch (err) {
      return false;
    }
  }

  async isAuthorizedWithRedocly(): Promise<boolean> {
    return this.hasTokens() && isNotEmptyObject(await this.getValidTokens());
  }

  readCredentialsFile(credentialsPath: string) {
    return existsSync(credentialsPath) ? JSON.parse(readFileSync(credentialsPath, 'utf-8')) : {};
  }

  async verifyToken(
    accessToken: string,
    region: Region,
    verbose: boolean = false,
  ): Promise<{ viewerId: string; organizations: string[] }> {
    return this.registryApi.authStatus(accessToken, region, verbose);
  }

  async login(accessToken: string, verbose: boolean = false) {
    const credentialsPath = resolve(homedir(), TOKEN_FILENAME);
    process.stdout.write(gray('\n  Logging in...\n'));

    try {
      await this.verifyToken(accessToken, this.region, verbose);
    } catch (err) {
      process.stdout.write(
        red('Authorization failed. Please check if you entered a valid API key.\n'),
      );
      process.exit(1);
    }

    const credentials = {
      ...this.readCredentialsFile(credentialsPath),
      [this.region!]: accessToken,
      token: accessToken, // FIXME: backward compatibility, remove on 1.0.0
    };
    this.accessTokens = credentials;
    this.registryApi.setAccessTokens(credentials);
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
  const domain = REDOCLY_DOMAIN || process.env.REDOCLY_DOMAIN || DOMAINS[DEFAULT_REGION];

  const legacyDomain = domain === 'redocly.com' ? 'redoc.ly' : domain;

  if (
    !link.startsWith(`https://api.${domain}/registry/`) &&
    !link.startsWith(`https://api.${legacyDomain}/registry/`)
  ) {
    return false;
  }

  return true;
}
