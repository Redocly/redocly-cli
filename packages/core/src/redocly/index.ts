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

  async verifyToken(accessToken: string, verbose: boolean = false): Promise<boolean> {
    if (!accessToken) return false;
    const authDetails = await RedoclyClient.authorize(accessToken, { verbose });
    if (!authDetails) return false;
    return true;
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

  async query(queryString: string, parameters = {}, headers = {}) {
    return query(queryString, parameters, {
      Authorization: this.accessToken,
      ...headers,
    });
  }

  static async authorize(accessToken: string, options: { queryName?: string; verbose?: boolean }) {
    const { queryName = '', verbose = false } = options;
    try {
      const queryStr = `query ${queryName}{ viewer { id } }`;

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

  updateDefinitionVersion(definitionId: number, versionId: number, updatePatch: object): Promise<void> {
    return this.query(`
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

  getOrganizationId(organizationId: string) {
    return this.query(`
      query ($organizationId: String!) {
        organizationById(id: $organizationId) {
          id
        }
      }
    `, {
      organizationId
    });
  }

  getDefinitionByName(name: string, organizationId: string) {
    return this.query(`
      query ($name: String!, $organizationId: String!) {
        definition: definitionByOrganizationIdAndName(name: $name, organizationId: $organizationId) {
          id
        }
      }
    `, {
      name,
      organizationId
    });
  }

  createDefinition(organizationId: string, name: string) {
    return this.query(`
      mutation CreateDefinition($organizationId: String!, $name: String!) {
        def: createDefinition(input: {organizationId: $organizationId, name: $name }) {
          definition {
            id
            nodeId
            name
          }
        }
      }
    `, {
      organizationId,
      name
    })
  }

  createDefinitionVersion(definitionId: string, name: string, sourceType: string, source: any) {
    return this.query(`
      mutation CreateVersion($definitionId: Int!, $name: String!, $sourceType: DvSourceType!, $source: JSON) {
        createDefinitionVersion(input: {definitionId: $definitionId, name: $name, sourceType: $sourceType, source: $source }) {
          definitionVersion {
            id
          }
        }
      }
    `, {
      definitionId,
      name,
      sourceType,
      source
    });
  }

  getSignedUrl(organizationId: string, filesHash: string, fileName: string) {
    return this.query(`
      query ($organizationId: String!, $filesHash: String!, $fileName: String!) {
        signFileUploadCLI(organizationId: $organizationId, filesHash: $filesHash, fileName: $fileName) {
          signedFileUrl
          uploadedFilePath
        }
      }
    `, {
      organizationId,
      filesHash,
      fileName
    })
  }

  getDefinitionVersion(organizationId: string, definitionName: string, versionName: string) {
    return this.query(`
      query ($organizationId: String!, $definitionName: String!, $versionName: String!) {
        version: definitionVersionByOrganizationDefinitionAndName(organizationId: $organizationId, definitionName: $definitionName, versionName: $versionName) {
          id
          definitionId
          defaultBranch {
            name
          }
        }
      }
    `, {
      organizationId,
      definitionName,
      versionName
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
    // FIXME
    if (pathParts.length === 7) return false;

    return true;
  }
}
