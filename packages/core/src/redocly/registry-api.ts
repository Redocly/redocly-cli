import fetch, { RequestInit } from 'node-fetch';
import { RegistryApiTypes } from './registry-api-types';
const version = require('../../package.json').version;

export class RegistryApi {
  private readonly baseUrl = this.getBaseUrl();

  constructor(private accessToken?: string, private domain?: string) {}

  getBaseUrl() {
    return `https://api.${this.domain || 'redoc.ly'}/registry`;
  }

  private async request(path = '', options: RequestInit = {}, accessToken?: string) {
    if (!this.accessToken && !accessToken) {
      throw new Error('Unauthorized');
    }

    const headers = Object.assign({}, options.headers || {}, {
      authorization: accessToken || this.accessToken,
      'x-redocly-cli-version': version,
    });

    const response = await fetch(`${this.baseUrl}${path}`, Object.assign({}, options, { headers }));
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }

    if (response.status === 404) {
      const body: RegistryApiTypes.NotFoundProblemResponse = await response.json();
      throw new Error(body.code);
    }

    return response;
  }

  async authStatus(accessToken: string, verbose = false) {
    try {
      const response = await this.request('', {}, accessToken);
      return response.ok;
    } catch (error) {
      if (verbose) {
        console.log(error);
      }
      return false;
    }
  }

  async prepareFileUpload({
    organizationId,
    name,
    version,
    filesHash,
    filename,
    isUpsert,
  }: RegistryApiTypes.PrepareFileuploadParams): Promise<RegistryApiTypes.PrepareFileuploadOKResponse> {
    const response = await this.request(
      `/${organizationId}/${name}/${version}/prepare-file-upload`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          filesHash,
          filename,
          isUpsert,
        }),
      },
    );

    if (response.ok) {
      return response.json();
    }

    throw new Error('Could not prepare file upload');
  }

  async pushApi({
    organizationId,
    name,
    version,
    rootFilePath,
    filePaths,
    branch,
    isUpsert,
  }: RegistryApiTypes.PushApiParams) {
    const response = await this.request(`/${organizationId}/${name}/${version}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        rootFilePath,
        filePaths,
        branch,
        isUpsert,
      }),
    });

    if (response.ok) {
      return;
    }

    throw new Error('Could not push api');
  }
}
