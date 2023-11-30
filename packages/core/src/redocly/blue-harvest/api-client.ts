import fetch from 'node-fetch';
import * as FormData from 'form-data';

import type { Response } from 'node-fetch';
import type { ReadStream } from 'fs';
import type {
  ListRemotesResponse,
  ProjectSourceResponse,
  PushResponse,
  PushStatusResponse,
  UpsertRemoteResponse,
} from './types';

class RemotesApiClient {
  constructor(private readonly domain: string, private readonly apiKey: string) {}

  private async getParsedResponse<T>(response: Response): Promise<T> {
    const responseBody = await response.json();

    if (response.ok) {
      return responseBody as T;
    }

    throw new Error(responseBody.title || response.statusText);
  }

  async getDefaultBranch(organizationId: string, projectId: string) {
    const response = await fetch(
      `${this.domain}/api/orgs/${organizationId}/projects/${projectId}/source`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    try {
      const source = await this.getParsedResponse<ProjectSourceResponse>(response);

      return source.branchName;
    } catch (err) {
      throw new Error(`Failed to fetch default branch: ${err.message || 'Unknown error'}`);
    }
  }

  async upsert(
    organizationId: string,
    projectId: string,
    remote: {
      mountPath: string;
      mountBranchName: string;
    }
  ): Promise<UpsertRemoteResponse> {
    const response = await fetch(
      `${this.domain}/api/orgs/${organizationId}/projects/${projectId}/remotes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          mountPath: remote.mountPath,
          mountBranchName: remote.mountBranchName,
          type: 'CICD',
          autoMerge: true,
        }),
      }
    );

    try {
      return await this.getParsedResponse<UpsertRemoteResponse>(response);
    } catch (err) {
      throw new Error(`Failed to upsert remote: ${err.message || 'Unknown error'}`);
    }
  }

  async push(
    organizationId: string,
    projectId: string,
    remoteId: string,
    payload: {
      commit: {
        message: string;
        branchName: string;
        author: {
          name: string;
          email: string;
        };
      };
    },
    files: { path: string; stream: ReadStream | Buffer }[]
  ): Promise<PushResponse> {
    const formData = new FormData();

    formData.append('commit[message]', payload.commit.message);
    formData.append('commit[author][name]', payload.commit.author.name);
    formData.append('commit[author][email]', payload.commit.author.email);
    formData.append('commit[branchName]', payload.commit.branchName);

    for (const file of files) {
      formData.append(`files[${file.path}]`, file.stream);
    }

    const response = await fetch(
      `${this.domain}/api/orgs/${organizationId}/projects/${projectId}/remotes/${remoteId}/push`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      }
    );

    try {
      return await this.getParsedResponse<PushResponse>(response);
    } catch (err) {
      throw new Error(`Failed to push: ${err.message || 'Unknown error'}`);
    }
  }

  async getRemotesList(organizationId: string, projectId: string, mountPath: string) {
    const response = await fetch(
      `${this.domain}/api/orgs/${organizationId}/projects/${projectId}/remotes?filter=mountPath:/${mountPath}/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    try {
      return await this.getParsedResponse<ListRemotesResponse>(response);
    } catch (err) {
      throw new Error(`Failed to get remote list: ${err.message || 'Unknown error'}`);
    }
  }

  async getPushStatus({
    organizationId,
    projectId,
    pushId,
    remoteId,
  }: {
    organizationId: string;
    projectId: string;
    pushId: string;
    remoteId: string;
  }) {
    const response = await fetch(
      `${this.domain}/api/orgs/${organizationId}/projects/${projectId}/remotes/${remoteId}/push-status/${pushId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    try {
      return await this.getParsedResponse<PushStatusResponse>(response);
    } catch (err) {
      throw new Error(`Failed to get push status: ${err.message || 'Unknown error'}`);
    }
  }
}

export class ApiClient {
  remotes: RemotesApiClient;

  constructor(public domain: string, private readonly apiKey: string) {
    this.remotes = new RemotesApiClient(this.domain, this.apiKey);
  }
}
