import {
  existsSync, readFileSync, writeFileSync, unlinkSync,
} from 'fs';
import yaml from 'js-yaml';
import { resolve } from 'path';
import { homedir } from 'os';

import query from './query';

export default class RedoclyClient {
  constructor() {
    const credentialsPath = resolve(homedir(), '.redocly.token.json');
    let credentials = {};
    if (existsSync(credentialsPath)) {
      credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
    }
    const authDetails = RedoclyClient.authorize(credentials.token);
    if (authDetails) {
      this.accessToken = credentials.token;
    }
  }

  getAuthorizationHeader() {
    return this.accessToken;
  }

  login(accessToken) {
    const credentialsPath = resolve(homedir(), '.redocly.token.json');
    const authDetails = RedoclyClient.authorize(accessToken);
    if (authDetails) {
      this.accessToken = accessToken;
      const credentials = {
        token: accessToken,
      };
      writeFileSync(credentialsPath, JSON.stringify(credentials));
      process.stdout.write('Authorization confirmed.\n');
    } else {
      process.stdout.write('Authorization failed. Please check if you entered a valid token.\n');
    }
  }

  logout() {
    const credentialsPath = resolve(homedir(), '.redocly.token.json');
    if (existsSync(credentialsPath)) {
      unlinkSync(credentialsPath);
    }
  }

  query(queryString, parameters = {}, headers = {}) {
    return query(queryString, parameters,
      {
        Authorization: this.accessToken,
        ...headers,
      });
  }

  static authorize(accessToken, verbose = false) {
    try {
      const result = query(`
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

  isLoggedIn() {
    try {
      this.query(`
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

  listDefinitions() {
    const result = this.query(`
    {
      definitions{
        id
        definitionVersions{
          id
          name
          sourceType
        }
      }
    }
    `,
    {});
    return result.definitions;
  }

  updateDependencies(dependencies, authorizationToken) {
    const r = this.query(`
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

  processRegistryDependency(link, ctx) {
    const domain = process.env.REDOCLY_DOMAIN || 'redocly-dev.win';
    if (link.indexOf(`https://api.${domain}/registry/`) !== 0) return;
    const registryPath = link.replace(`https://api.${domain}/registry/`, '');

    const pathParts = registryPath.split('/');

    // we can be sure, that there is job UUID present
    // (org, definition, version, bundle, branch, job)
    // so skip this link.
    if (pathParts.length === 6) return;

    ctx.dependencies.push(link);
  }

  getLintConfig(organization, definitionName, versionName) {
    // console.log(organization, definitionName, versionName);
    const config = this.query(`
    query GetConfig($organization: String!, $definitionName:String!, $versionName:String!){
      version: searchDefinitionVersion(organization:$organization, definitionName:$definitionName, versionName:$versionName){
        name
        resolvedLintConfig
      }
    }
    `,
    {
      organization,
      definitionName,
      versionName,
    });
    return (config.version && config.version.resolvedLintConfig) || '{}';
  }
}
