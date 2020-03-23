import {
  existsSync, readFileSync, writeFileSync, unlinkSync,
} from 'fs';
import { resolve } from 'path';

import query from './query';

export default class RedoclyClient {
  constructor(clientId, clientSecret) {
    if (!(clientId && clientSecret)) {
      const credentialsPath = resolve(__dirname, '../credentials.json');
      let credentials = {};
      if (existsSync(credentialsPath)) {
        credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
      }
      // eslint-disable-next-line no-param-reassign
      clientId = process.env.REDOCLY_CLIENT_ID || credentials.clientId;
      // eslint-disable-next-line no-param-reassign
      clientSecret = process.env.REDOCLY_CLIENT_SECRET || credentials.clientSecret;
    }
    this.accessToken = `${clientId}:${clientSecret}`;
  }

  getAuthorizationHeader() {
    return this.accessToken;
  }

  logout() {
    const credentialsPath = resolve(__dirname, '../credentials.json');
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

  authorize(clientId, clientSecret) {
    try {
      const result = this.query(`
      {
        viewer {
          id
          email
        }
      }
      `,
      {},
      {
        authorization: `${clientId}:${clientSecret}`,
      });
      this.accessToken = `${clientId}:${clientSecret}`;
      const credentialsPath = resolve(__dirname, '../credentials.json');
      writeFileSync(credentialsPath, JSON.stringify({ clientId, clientSecret }));
      return result;
    } catch (e) {
      console.log(e);
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
    return this.query(`
    mutation UpdateBranchDependencies ($dependencies: JSON!, $definitionId: String!, $versionId: String!, $branchId: String) {
      updateBranchDependencies
    }
    `,
    {
      dependencies,
      definitionId: process.env.DEFINITION,
      versionId: process.env.VERSION,
      branchId: process.env.BRANCH,
    }, {
      Authorization: authorizationToken,
    });
  }

  processRegistryDependency(link, ctx) {
    if (link.indexOf('https://api.redocly-dev.win/registry/') !== 0) return;
    const registryPath = link.replace('https://api.redocly-dev.win/registry/', '');

    const pathParts = registryPath.split('/');
    const [organizationId, definitionName, definitionVersionName, _, branchName, jobUUID] = pathParts;

    if (jobUUID) return;
    const requirementInfo = {
      organizationId,
      definitionName,
      definitionVersionName,
      branchName,
    };

    ctx.dependencies.push(requirementInfo);
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
