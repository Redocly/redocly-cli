import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
import { yellow, red, green, gray } from 'colorette';
import { query } from './query';

const TOKEN_FILENAME = '.redocly-config.json';

export class RedoclyClient {
  private accessToken: string | undefined;

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

  async verifyToken(accessToken: string): Promise<boolean> {
    if (!accessToken) return false;
    const authDetails = await RedoclyClient.authorize(accessToken, true);
    if (!authDetails) return false;
    return true;
  }

  async getAuthorizationHeader(): Promise<string | undefined> {
    // print this only if there is token but invalid
    if (this.accessToken && !(await this.verifyToken(this.accessToken))) {
      process.stderr.write(
        `${yellow(
          'Warning:',
        )} invalid Redoc.ly access token. Use "npx @redocly/openapi-cli login" to provide your access token\n`,
      );
      return undefined;
    }
    return this.accessToken;
  }

  async login(accessToken: string) {
    const credentialsPath = resolve(homedir(), TOKEN_FILENAME);
    process.stdout.write(gray('\n  Logging in...\n'));

    const authorized = await this.verifyToken(accessToken);

    if (!authorized) {
      process.stdout.write(
        red('Authorization failed. Please check if you entered a valid token.\n'),
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
    process.stdout.write('Logged out from the Redoc.ly account. ✋\n');
  }

  async query(queryString: string, parameters = {}, headers = {}) {
    return query(queryString, parameters, {
      Authorization: this.accessToken,
      ...headers,
    });
  }

  static async authorize(accessToken: string, verbose: boolean = false) {
    try {
      const queryStr = `{ definitions { id } }`;

      return await query(queryStr, {}, { Authorization: accessToken });
    } catch (e) {
      if (verbose) console.log(e);
      return null;
    }
  }

  async updateDependencies(dependencies: string[] | undefined): Promise<void> {
    const definitionId = process.env.DEFINITION;
    const versionId = process.env.DEFINITION;
    const branchId = process.env.BRANCH;

    if (!definitionId || !versionId || !branchId) return;

    await this.query(
      `
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
        definitionId: parseInt(definitionId, 10),
        versionId: parseInt(versionId, 10),
        branchId: parseInt(branchId, 10),
      },
    );
  }

  async updateDefinitionVersion(definitionId: number, versionId: number, updatePatch: object): Promise<void> {
    await this.query(`
      mutation UpdateDefinitionVersion($definitionId: Int!, $versionId: Int!, $updatePatch: DefinitionVersionPatch!) {
        updateDefinitionVersionByDefinitionIdAndId(input: {definitionId: $definitionId, id: $versionId, patch: $updatePatch}) {
          definitionVersion {
            ...VersionDetails
            __typename
          }
          __typename
        }
      }
      
      fragment VersionDetails on DefinitionVersion {
        id
        nodeId
        uuid
        definitionId
        name
        description
        sourceType
        source
        registryAccess
        __typename
      }
    `,
      {
        definitionId,
        versionId,
        updatePatch,
      },
    );
  }

  static isRegistryURL(link: string): boolean {
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
}
