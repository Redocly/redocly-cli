import * as FormData from 'form-data';
import fetchWithTimeout, {
  type FetchWithTimeoutOptions,
  DEFAULT_FETCH_TIMEOUT,
} from '../../utils/fetch-with-timeout';

import type { Response } from 'node-fetch';
import type { ReadStream } from 'fs';
import type {
  ListRemotesResponse,
  ProjectSourceResponse,
  PushResponse,
  UpsertRemoteResponse,
} from './types';

export class ReuniteApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

class ReuniteBaseApiClient {
  constructor(protected version: string, protected command: string) {}

  protected async getParsedResponse<T>(response: Response): Promise<T> {
    const responseBody = await response.json();

    if (response.ok) {
      return responseBody as T;
    }

    throw new ReuniteApiError(
      `${responseBody.title || response.statusText || 'Unknown error'}.`,
      response.status
    );
  }

  protected request(url: string, options: FetchWithTimeoutOptions) {
    const headers = {
      ...options.headers,
      'user-agent': `redocly-cli/${this.version.trim()} ${this.command}`,
    };

    return fetchWithTimeout(url, {
      ...options,
      headers,
    });
  }
}

class RemotesApiClient extends ReuniteBaseApiClient {
  constructor(
    private readonly domain: string,
    private readonly apiKey: string,
    version: string,
    command: string
  ) {
    super(version, command);
  }

  async getDefaultBranch(organizationId: string, projectId: string) {
    try {
      const response = await this.request(
        `${this.domain}/api/orgs/${organizationId}/projects/${projectId}/source`,
        {
          timeout: DEFAULT_FETCH_TIMEOUT,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const source = await this.getParsedResponse<ProjectSourceResponse>(response);

      return source.branchName;
    } catch (err) {
      const message = `Failed to fetch default branch. ${err.message}`;

      if (err instanceof ReuniteApiError) {
        throw new ReuniteApiError(message, err.status);
      }

      throw new Error(message);
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
    try {
      const response = await this.request(
        `${this.domain}/api/orgs/${organizationId}/projects/${projectId}/remotes`,
        {
          timeout: DEFAULT_FETCH_TIMEOUT,
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

      return await this.getParsedResponse<UpsertRemoteResponse>(response);
    } catch (err) {
      const message = `Failed to upsert remote. ${err.message}`;

      if (err instanceof ReuniteApiError) {
        throw new ReuniteApiError(message, err.status);
      }

      throw new Error(message);
    }
  }

  async push(
    organizationId: string,
    projectId: string,
    payload: PushPayload,
    files: { path: string; stream: ReadStream | Buffer }[]
  ): Promise<PushResponse> {
    const formData = new FormData();

    formData.append('remoteId', payload.remoteId);
    formData.append('commit[message]', payload.commit.message);
    formData.append('commit[author][name]', payload.commit.author.name);
    formData.append('commit[author][email]', payload.commit.author.email);
    formData.append('commit[branchName]', payload.commit.branchName);
    payload.commit.url && formData.append('commit[url]', payload.commit.url);
    payload.commit.namespace && formData.append('commit[namespaceId]', payload.commit.namespace);
    payload.commit.sha && formData.append('commit[sha]', payload.commit.sha);
    payload.commit.repository && formData.append('commit[repositoryId]', payload.commit.repository);
    payload.commit.createdAt && formData.append('commit[createdAt]', payload.commit.createdAt);

    for (const file of files) {
      formData.append(`files[${file.path}]`, file.stream);
    }

    payload.isMainBranch && formData.append('isMainBranch', 'true');
    try {
      const response = await this.request(
        `${this.domain}/api/orgs/${organizationId}/projects/${projectId}/pushes`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: formData,
        }
      );

      return await this.getParsedResponse<PushResponse>(response);
    } catch (err) {
      const message = `Failed to push. ${err.message}`;

      if (err instanceof ReuniteApiError) {
        throw new ReuniteApiError(message, err.status);
      }

      throw new Error(message);
    }
  }

  async getRemotesList({
    organizationId,
    projectId,
    mountPath,
  }: {
    organizationId: string;
    projectId: string;
    mountPath: string;
  }) {
    try {
      const response = await this.request(
        `${this.domain}/api/orgs/${organizationId}/projects/${projectId}/remotes?filter=mountPath:/${mountPath}/`,
        {
          timeout: DEFAULT_FETCH_TIMEOUT,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      return await this.getParsedResponse<ListRemotesResponse>(response);
    } catch (err) {
      const message = `Failed to get remote list. ${err.message}`;

      if (err instanceof ReuniteApiError) {
        throw new ReuniteApiError(message, err.status);
      }

      throw new Error(message);
    }
  }

  async getPush({
    organizationId,
    projectId,
    pushId,
  }: {
    organizationId: string;
    projectId: string;
    pushId: string;
  }) {
    try {
      const response = await this.request(
        `${this.domain}/api/orgs/${organizationId}/projects/${projectId}/pushes/${pushId}`,
        {
          timeout: DEFAULT_FETCH_TIMEOUT,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      return await this.getParsedResponse<PushResponse>(response);
    } catch (err) {
      const message = `Failed to get push status. ${err.message}`;

      if (err instanceof ReuniteApiError) {
        throw new ReuniteApiError(message, err.status);
      }

      throw new Error(message);
    }
  }
}

export class ReuniteApiClient {
  remotes: RemotesApiClient;

  constructor({
    domain,
    apiKey,
    version,
    command,
  }: {
    domain: string;
    apiKey: string;
    version: string;
    command: 'push' | 'push-status';
  }) {
    this.remotes = new RemotesApiClient(domain, apiKey, version, command);
  }
}

export type PushPayload = {
  remoteId: string;
  commit: {
    message: string;
    branchName: string;
    sha?: string;
    url?: string;
    createdAt?: string;
    namespace?: string;
    repository?: string;
    author: {
      name: string;
      email: string;
      image?: string;
    };
  };
  isMainBranch?: boolean;
};
