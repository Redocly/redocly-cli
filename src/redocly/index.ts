/* eslint-disable max-len */
import {
  existsSync, readFileSync, writeFileSync, unlinkSync,
} from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
import * as chalk from 'chalk';

import query from './query';

const TOKEN_FILENAME = '.redocly-config.json';

export default class RedoclyClient {
  private accessToken:string|undefined;

  constructor() {
    this.loadToken();
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

  async verifyToken(accessToken:string): Promise<boolean> {
    if (!accessToken) return false;
    const authDetails = await RedoclyClient.authorize(accessToken);
    if (!authDetails) return false;
    return true;
  }

  async getAuthorizationHeader(): Promise<string|undefined> {
    // print this only if there is token but invalid
    if (this.accessToken && !(await this.verifyToken(this.accessToken))) {
      process.stdout.write(
        `${chalk.yellow('Warning:')} invalid Redoc.ly access token. Use "npx @redocly/openapi-cli registry:login" to provide your access token\n`,
      );
      return undefined;
    }
    return this.accessToken;
  }

  async login(accessToken:string) {
    const credentialsPath = resolve(homedir(), TOKEN_FILENAME);
    process.stdout.write(chalk.grey('\n  Logging in...\n'));

    const authorized = await this.verifyToken(accessToken);

    if (!authorized) {
      process.stdout.write(chalk.red('Authorization failed. Please check if you entered a valid token.\n'));
      process.exit(1);
    }

    this.accessToken = accessToken;
    const credentials = {
      token: accessToken,
    };

    writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
    process.stdout.write(chalk.green('  Authorization confirmed. ✅\n\n'));
  }

  logout(): void {
    const credentialsPath = resolve(homedir(), TOKEN_FILENAME);
    if (existsSync(credentialsPath)) {
      unlinkSync(credentialsPath);
    }
    process.stdout.write('Logged out from the Redoc.ly account. ✋\n');
  }

  async query(queryString:string, parameters = {}, headers = {}) {
    return query(queryString, parameters,
      {
        Authorization: this.accessToken,
        ...headers,
      });
  }

  static async authorize(accessToken:string, verbose:boolean = false) {
    try {
      const result = await query(`
      {
        definitions {
          id
        }
      }
      `,
      {},
      {
        Authorization: accessToken,
      });
      return result;
    } catch (e) {
      if (verbose) process.stderr.write(e);
      return null;
    }
  }

  async updateDependencies(dependencies: string[] | undefined): Promise<void> {
    const definitionId = process.env.DEFINITION;
    const versionId = process.env.DEFINITION;
    const branchId = process.env.BRANCH;

    if ([definitionId, versionId, branchId].includes(undefined)) return;

    await this.query(`
    mutation UpdateBranchDependenciesFromURLs(
      $urls: [String!]!
      $definitionId: Int!
      $versionId: Int!
      $branchId: Int!
    ) {
      updateBranchDependenciesFromURLs(
        definitionId: $definitionId
        versionId: $versionId
        branchId: $branchId
        urls: $urls
      ) {
        branchName
      }
    }
    `,
    {
      urls: dependencies || [],
      definitionId: parseInt(definitionId as string, 10),
      versionId: parseInt(versionId as string, 10),
      branchId: parseInt(branchId as string, 10),
    });
  }

  static isRegistryURL(link: string): boolean {
    const domain = process.env.REDOCLY_DOMAIN || 'redoc.ly';
    if (!link.startsWith(`https://api.${domain}/registry/`)) return false;
    const registryPath = link.replace(`https://api.${domain}/registry/`, '');

    const pathParts = registryPath.split('/');

    // we can be sure, that there is job UUID present
    // (org, definition, version, bundle, branch, job, "openapi.yaml" 🤦‍♂️)
    // so skip this link.
    if (pathParts.length === 7) return false;

    return true;
  }
}
