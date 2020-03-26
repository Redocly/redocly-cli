/* eslint-disable max-len */
import {
  existsSync, readFileSync, writeFileSync, unlinkSync,
} from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';

import query from './query';

export default class RedoclyClient {
  constructor() {
    this.loadStoredToken();
  }

  loadStoredToken() {
    const credentialsPath = resolve(homedir(), '.redocly.token.json');
    if (existsSync(credentialsPath)) {
      const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
      this.accessToken = credentials && credentials.token;
    }
  }

  async verifyToken() {
    const credentialsPath = resolve(homedir(), '.redocly.token.json');
    let credentials = {};
    if (existsSync(credentialsPath)) {
      credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
    }
    const authDetails = await RedoclyClient.authorize(credentials.token);
    if (authDetails) {
      this.accessToken = credentials.token;
      return true;
    }
    return false;
  }

  async getAuthorizationHeader() {
    if (!(await this.verifyToken())) {
      process.stdout.write(
        `${chalk.yellow('Warning')}, failed to login into Redoc.ly account. Use "openapi login" to provide your access token\n`,
      );
      return null;
    }
    return this.accessToken;
  }

  async login(accessToken) {
    const credentialsPath = resolve(homedir(), '.redocly.token.json');
    process.stdout.write(chalk.grey('Logging in...\n'));
    const authDetails = await RedoclyClient.authorize(accessToken);
    if (authDetails) {
      this.accessToken = accessToken;
      const credentials = {
        token: accessToken,
      };
      writeFileSync(credentialsPath, JSON.stringify(credentials));
      process.stdout.write(chalk.green('Authorization confirmed. ✅\n'));
    } else {
      process.stdout.write(chalk.red('Authorization failed. Please check if you entered a valid token.\n'));
    }
  }

  logout() {
    const credentialsPath = resolve(homedir(), '.redocly.token.json');
    if (existsSync(credentialsPath)) {
      unlinkSync(credentialsPath);
    }
    process.stdout.write('Logged out from the Redoc.ly account. ✋\n');
  }

  async query(queryString, parameters = {}, headers = {}) {
    return query(queryString, parameters,
      {
        Authorization: this.accessToken,
        ...headers,
      });
  }

  static async authorize(accessToken, verbose = false) {
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

  async isLoggedIn() {
    try {
      await this.query(`
        {
          viewer {
            id
            email
          }
        }
      `);
      return true;
    } catch (e) {
      return false;
    }
  }

  async updateDependencies(dependencies, authorizationToken) {
    const r = await this.query(`
    mutation UpdateBranchDependencies ($dependencies: [String!]!, $definitionId: Int!, $versionId: Int!, $branchId: Int!) {
      updateBranchDependencies(definitionId:$definitionId, versionId:$versionId, branchId:$branchId, dependencies:$dependencies){
        branchName
      }
    }
    `,
    {
      dependencies: dependencies || [],
      definitionId: parseInt(process.env.DEFINITION, 10),
      versionId: parseInt(process.env.VERSION, 10),
      branchId: parseInt(process.env.BRANCH, 10),
    }, {
      Authorization: authorizationToken,
    });
    return r;
  }

  static isRegistryURL(link) {
    const domain = process.env.REDOCLY_DOMAIN || 'redoc.ly';
    if (!link.startsWith(`https://api.${domain}/registry/`)) return false;
    const registryPath = link.replace(`https://api.${domain}/registry/`, '');

    const pathParts = registryPath.split('/');

    // we can be sure, that there is job UUID present
    // (org, definition, version, bundle, branch, job)
    // so skip this link.
    if (pathParts.length === 6) return false;

    return true;
  }
}
