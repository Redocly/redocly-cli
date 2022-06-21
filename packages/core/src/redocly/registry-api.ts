import fetch, { RequestInit, HeadersInit } from 'node-fetch';
import { RegistryApiTypes } from './registry-api-types';
import { DEFAULT_REGION, DOMAINS } from '../config/config';
import { isNotEmptyObject } from '../utils';
const version = require('../../package.json').version;

import type { AccessTokens, Region } from '../config/types';

export class RegistryApi {
  constructor(private accessTokens: AccessTokens, private region: Region) {}

  get accessToken() {
    return isNotEmptyObject(this.accessTokens) && this.accessTokens[this.region];
  }

  getBaseUrl(region: Region = DEFAULT_REGION) {
    return `https://api.${DOMAINS[region]}/registry`;
  }

  setAccessTokens(accessTokens: AccessTokens) {
    this.accessTokens = accessTokens;
    return this;
  }

  private async request(path = '', options: RequestInit = {}, region?: Region) {
    const headers = Object.assign({}, options.headers || {}, { 'x-redocly-cli-version': version });

    if (!headers.hasOwnProperty('authorization')) {
      throw new Error('Unauthorized');
    }

    const response = await fetch(
      `${this.getBaseUrl(region)}${path}`,
      Object.assign({}, options, { headers }),
    );

    if (response.status === 401) {
      throw new Error('Unauthorized');
    }

    if (response.status === 404) {
      const body: RegistryApiTypes.NotFoundProblemResponse = await response.json();
      throw new Error(body.code);
    }

    return response;
  }

  async authStatus(
    accessToken: string,
    region: Region,
    verbose = false,
  ): Promise<{ viewerId: string; organizations: string[] }> {
    try {
      const response = await this.request('', { headers: { authorization: accessToken } }, region);

      return await response.json();
    } catch (error) {
      if (verbose) {
        console.log(error);
      }

      throw error;
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
        headers: {
          'content-type': 'application/json',
          authorization: this.accessToken,
        } as HeadersInit,
        body: JSON.stringify({
          filesHash,
          filename,
          isUpsert,
        }),
      },
      this.region,
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
    isPublic,
    batchId,
    batchSize
  }: RegistryApiTypes.PushApiParams) {
    const response = await this.request(
      `/${organizationId}/${name}/${version}`,
      {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          authorization: this.accessToken,
        } as HeadersInit,
        body: JSON.stringify({
          rootFilePath,
          filePaths,
          branch,
          isUpsert,
          isPublic,
          batchId,
          batchSize
        }),
      },
      this.region,
    );

    if (response.ok) {
      return;
    }

    throw new Error('Could not push api');
  }
}
