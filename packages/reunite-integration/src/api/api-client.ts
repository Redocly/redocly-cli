import type { ReadStream } from 'node:fs';
import type { Readable } from 'node:stream';

import { DEFAULT_CLI_VERSION, DEFAULT_FETCH_TIMEOUT } from '../utils/constants.js';
import fetchWithTimeout, { type FetchWithTimeoutOptions } from '../utils/fetch-with-timeout.js';
import { getRedoclyEnvironment } from '../utils/redocly-environment.js';
import type { ProjectSourceResponse, PushResponse, UpsertRemoteResponse } from './types.js';

interface BaseApiClient {
  request(url: string, options: FetchWithTimeoutOptions): Promise<Response>;
}
type CommandOption = 'push' | 'push-status';
export type SunsetWarning = { sunsetDate: Date; isSunsetExpired: boolean };
export type SunsetWarningsBuffer = SunsetWarning[];

export class ReuniteApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export class ReuniteApiClient implements BaseApiClient {
  public sunsetWarnings: SunsetWarningsBuffer = [];

  constructor(
    protected command: string,
    protected version: string = DEFAULT_CLI_VERSION
  ) {}

  public async request(url: string, options: FetchWithTimeoutOptions) {
    const environment = getRedoclyEnvironment();
    const headers = {
      ...options.headers,
      'user-agent': `redocly-cli/${this.version} ${this.command}${environment ? ` ${environment}` : ''}`,
    };

    try {
      const response = await fetchWithTimeout(url, {
        ...options,
        headers,
      });

      this.collectSunsetWarning(response);

      return response;
    } catch (err) {
      let errorMessage = 'Failed to fetch.';

      if (err.cause) {
        errorMessage += ` Caused by ${err.cause.message || err.cause.name}.`;
      }

      if (err.code || err.cause?.code) {
        errorMessage += ` Code: ${err.code || err.cause?.code}`;
      }

      throw new Error(errorMessage);
    }
  }

  private collectSunsetWarning(response: Response) {
    const sunsetTime = this.getSunsetDate(response);

    if (!sunsetTime) return;

    const sunsetDate = new Date(sunsetTime);

    if (sunsetTime > Date.now()) {
      this.sunsetWarnings.push({
        sunsetDate,
        isSunsetExpired: false,
      });
    } else {
      this.sunsetWarnings.push({
        sunsetDate,
        isSunsetExpired: true,
      });
    }
  }

  private getSunsetDate(response: Response): number | undefined {
    const { headers } = response;

    if (!headers) {
      return;
    }

    const sunsetDate = headers.get('sunset') || headers.get('Sunset');

    if (!sunsetDate) {
      return;
    }

    return Date.parse(sunsetDate);
  }
}

class RemotesApi {
  constructor(
    private client: BaseApiClient,
    private readonly domain: string,
    private readonly apiKey: string
  ) {}

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

  async getDefaultBranch(organizationId: string, projectId: string) {
    try {
      const response = await this.client.request(
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
      const response = await this.client.request(
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
    const formData = new globalThis.FormData();

    formData.append('remoteId', payload.remoteId);
    formData.append('commit[message]', payload.commit.message);
    formData.append('commit[author][name]', payload.commit.author.name);
    formData.append('commit[author][email]', payload.commit.author.email);
    formData.append('commit[branchName]', payload.commit.branchName);
    if (payload.commit.url) {
      formData.append('commit[url]', payload.commit.url);
    }
    if (payload.commit.namespace) {
      formData.append('commit[namespaceId]', payload.commit.namespace);
    }
    if (payload.commit.sha) {
      formData.append('commit[sha]', payload.commit.sha);
    }
    if (payload.commit.repository) {
      formData.append('commit[repositoryId]', payload.commit.repository);
    }
    if (payload.commit.createdAt) {
      formData.append('commit[createdAt]', payload.commit.createdAt);
    }

    for (const file of files) {
      const blob = Buffer.isBuffer(file.stream)
        ? new Blob([file.stream as BlobPart])
        : new Blob([(await streamToBuffer(file.stream)) as BlobPart]);
      formData.append(`files[${file.path}]`, blob, file.path);
    }

    if (payload.isMainBranch) {
      formData.append('isMainBranch', 'true');
    }
    try {
      const response = await this.client.request(
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
      const response = await this.client.request(
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

export class ReuniteApi {
  private apiClient: ReuniteApiClient;

  public remotes: RemotesApi;

  constructor({
    domain,
    apiKey,
    command,
    version,
  }: {
    domain: string;
    apiKey: string;
    command: CommandOption;
    version?: string;
  }) {
    this.apiClient = new ReuniteApiClient(command, version);

    this.remotes = new RemotesApi(this.apiClient, domain, apiKey);
  }

  // The most urgent sunset warning the Reunite API sent through this client so far, if any.
  public getSunsetWarning(): SunsetWarning | undefined {
    return getMostUrgentSunsetWarning(this.apiClient.sunsetWarnings);
  }
}

// An expired sunset comes first, then the closest upcoming one.
export function getMostUrgentSunsetWarning(
  sunsetWarnings: SunsetWarning[]
): SunsetWarning | undefined {
  const [mostUrgent] = [...sunsetWarnings].sort((a, b) => {
    if (a.isSunsetExpired !== b.isSunsetExpired) {
      return a.isSunsetExpired ? -1 : 1;
    }

    return a.sunsetDate > b.sunsetDate ? 1 : -1;
  });

  return mostUrgent;
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

export async function streamToBuffer(stream: ReadStream | Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
