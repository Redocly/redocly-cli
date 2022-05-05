import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
import { green } from 'colorette';
import { RegistryApi } from './registry-api';
import { DEFAULT_REGION, DOMAINS, AVAILABLE_REGIONS, env } from '../config/config';
import { RegionalToken, RegionalTokenWithValidity } from './redocly-client-types';
import { isNotEmptyObject } from '../utils';

import type { AccessTokens, Region } from '../config/types';

const TOKEN_FILENAME = '.redocly-config.json';

export class RedoclyClient {
  private accessTokens: AccessTokens = {};
  private region: Region;
  domain: string;
  registryApi: RegistryApi;

  constructor(region?: Region) {
    this.region = this.loadRegion(region);
    this.loadTokens();
    this.domain = region ? DOMAINS[region] : env.REDOCLY_DOMAIN || DOMAINS[DEFAULT_REGION];

    env.REDOCLY_DOMAIN = this.domain; // isRedoclyRegistryURL depends on the value to be set
    this.registryApi = new RegistryApi(this.accessTokens, this.region);
  }

  loadRegion(region?: Region) {
    if (region && !DOMAINS[region]) {
      throw new Error(`Invalid argument: region in config file.\nGiven: ${green(region)}, choices: "us", "eu".`);
    }

    if (env.REDOCLY_DOMAIN) {
      return (AVAILABLE_REGIONS.find(
        (region) => DOMAINS[region as Region] === env.REDOCLY_DOMAIN,
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
    return this.accessTokens[this.region];
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
    if (env.REDOCLY_AUTHORIZATION) {
      this.setAccessTokens({
        ...this.accessTokens,
        [this.region]: env.REDOCLY_AUTHORIZATION,
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

    try {
      await this.verifyToken(accessToken, this.region, verbose);
    } catch (err) {
      throw new Error('Authorization failed. Please check if you entered a valid API key.');
    }

    const credentials = {
      ...this.readCredentialsFile(credentialsPath),
      [this.region!]: accessToken,
      token: accessToken, // FIXME: backward compatibility, remove on 1.0.0
    };
    this.accessTokens = credentials;
    this.registryApi.setAccessTokens(credentials);
    writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
  }

  logout(): void {
    const credentialsPath = resolve(homedir(), TOKEN_FILENAME);
    if (existsSync(credentialsPath)) {
      unlinkSync(credentialsPath);
    }
  }
}

export function isRedoclyRegistryURL(link: string): boolean {
  const domain = env.REDOCLY_DOMAIN || DOMAINS[DEFAULT_REGION];

  const legacyDomain = domain === 'redocly.com' ? 'redoc.ly' : domain;

  if (
    !link.startsWith(`https://api.${domain}/registry/`) &&
    !link.startsWith(`https://api.${legacyDomain}/registry/`)
  ) {
    return false;
  }

  return true;
}
