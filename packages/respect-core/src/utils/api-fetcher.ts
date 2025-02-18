import { fetch } from 'undici';
import { bgRed, inverse } from 'colorette';
import concat from 'concat-stream';
import { type OperationMethod, type VerboseLog, type TestContext, type ResponseContext } from '../types';
import { type ResultObject } from '../modules/flow-runner';
import { withHar } from '../utils/har-logs';
import { isEmpty } from './is-empty';
import { resolvePath } from '../modules/config-parser';
import { getVerboseLogs, maskSecrets } from '../modules/cli-output';
import { getResponseSchema } from '../modules/description-parser';
import { collectSecretFields } from '../modules/flow-runner';
import { createMtlsClient } from './mtls/create-mtls-client';
import { DefaultLogger } from './logger/logger';

const logger = DefaultLogger.getInstance();

const MAX_FETCH_TIMEOUT = 20000;

interface IFetcher {
  verboseLogs?: VerboseLog;
  verboseResponseLogs?: VerboseLog;
  harLogs?: any;
  fetch?: typeof fetch;
}

export function normalizeHeaders(headers: Record<string, string> | undefined) {
  if (!headers) {
    return {};
  }

  const headersToReturn: Record<string, string> = {};

  for (const key in headers) {
    const lowerCaseKey = key.toLowerCase();

    // Only add the first occurrence of any header (case-insensitive)
    if (!headersToReturn[lowerCaseKey]) {
      headersToReturn[lowerCaseKey] = headers[key];
    }
  }

  return headersToReturn;
}

export function isJsonContentType(contentType: string) {
  return /^application\/([a-z.-]+\+)?json$/.test(contentType);
}

export function isXmlContentType(contentType: string) {
  return /^application\/([a-z.-]+\+)?xml$/.test(contentType);
}

export function trimTrailingSlash(str: string): string {
  return str.endsWith('/') ? str.slice(0, -1) : str;
}

export class ApiFetcher implements IFetcher {
  verboseLogs?: VerboseLog;
  verboseResponseLogs?: VerboseLog;
  harLogs?: any;
  fetch?: typeof fetch;

  constructor(params: IFetcher) {
    this.harLogs = params.harLogs;
    this.fetch = params.fetch || fetch;
  }

  initVerboseLogs = ({ headerParams, host, path, method, body }: VerboseLog) => {
    this.verboseLogs = getVerboseLogs({
      headerParams,
      host,
      path,
      method,
      body: JSON.stringify(body),
    });
  };

  getVerboseLogs = () => {
    return this.verboseLogs;
  };

  initVerboseResponseLogs = ({
    headerParams,
    host,
    path,
    method,
    body,
    statusCode,
    responseTime,
  }: VerboseLog) => {
    this.verboseResponseLogs = getVerboseLogs({
      headerParams,
      host,
      path,
      method,
      body,
      statusCode,
      responseTime,
    });
  };

  getVerboseResponseLogs = () => {
    return this.verboseResponseLogs;
  };

  fetchResult = async (
    ctx: TestContext,
    requestData: ResultObject['requestData']
  ): Promise<ResponseContext | never> => {
    const { serverUrl, path, method, parameters, requestBody, openapiOperation } = requestData;
    if (!serverUrl?.url) {
      logger.error(bgRed(` No server url provided `));
      throw new Error('No server url provided');
    }

    const headers: Record<string, string> = {};
    const searchParams = new URLSearchParams();
    const pathParams: Record<string, string | number | boolean> = {};
    const cookies: Record<string, string> = {};

    for (const param of parameters) {
      switch (param.in) {
        case 'header':
          headers[param.name.toLowerCase()] = String(param.value);
          break;
        case 'query':
          searchParams.set(param.name, String(param.value));
          break;
        case 'path':
          pathParams[param.name] = String(param.value);
          break;
        case 'cookie':
          cookies[param.name] = String(param.value);
          break;
      }
    }

    if (typeof requestBody === 'object' && !headers['content-type']) {
      headers['content-type'] = 'application/json';
    }

    let resolvedPath = resolvePath(path, pathParams) || '';
    const pathWithSearchParams = `${resolvedPath}${
      searchParams.toString() ? '?' + searchParams.toString() : ''
    }`;
    const pathToFetch = `${trimTrailingSlash(serverUrl.url)}${pathWithSearchParams}`;

    if (pathToFetch.startsWith('/')) {
      logger.error(
        bgRed(` Wrong url: ${inverse(pathToFetch)} `) +
          ` Did you forget to provide a correct "serverUrl"?\n`
      );
    }

    const contentType = headers['content-type'] || '';
    if (requestBody && !contentType) {
      logger.error(
        bgRed(` Incorrect request `) +
          ` Please provide a correct "content-type" header or specify the "content-type" field in the test case itself. \n`
      );
    }

    let encodedBody;
    if (contentType === 'application/x-www-form-urlencoded') {
      encodedBody = new URLSearchParams(requestBody).toString();
    } else if (isJsonContentType(contentType || '')) {
      encodedBody = JSON.stringify(requestBody);
    } else if (isXmlContentType(contentType)) {
      encodedBody = requestBody;
    } else if (contentType.includes('multipart/form-data')) {
      // Get the form data buffer
      encodedBody = await new Promise((resolve, reject) => {
        requestBody.pipe(
          concat((data: Buffer) => {
            resolve(data);
          })
        );

        requestBody.on('error', reject);
      });

      // Ensure the content-type header includes the boundary
      headers['content-type'] = `multipart/form-data; boundary=${requestBody._boundary}`;
    } else if (contentType === 'application/octet-stream') {
      // Convert ReadStream to Blob for undici fetch
      encodedBody = await new Promise((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        requestBody.on('data', (chunk: Buffer) => {
          chunks.push(new Uint8Array(chunk.buffer));
        });
        requestBody.on('end', () => resolve(Buffer.concat(chunks)));
        requestBody.on('error', reject);
      });

      const fileName = requestBody.path.split('/').pop();
      headers['content-disposition'] = `attachment; filename=${fileName}`;
    } else {
      encodedBody = requestBody;
    }

    // Mask the secrets in the header params and the body
    const maskedHeaderParams = maskSecrets(headers, ctx.secretFields || new Set());
    const maskedBody =
      isJsonContentType(contentType) && encodedBody
        ? maskSecrets(JSON.parse(encodedBody), ctx.secretFields || new Set())
        : encodedBody;
    const maskedPathParams = maskSecrets(pathWithSearchParams, ctx.secretFields || new Set());

    // Start of the verbose logs
    this.initVerboseLogs({
      headerParams: maskedHeaderParams,
      host: serverUrl.url,
      method: (method || 'get').toUpperCase() as OperationMethod,
      path: maskedPathParams || '',
      body: maskedBody,
    });

    const wrappedFetch = this.harLogs ? withHar(this.fetch, { har: this.harLogs }) : fetch;
    // Resolve pathToFetch with pathParams for the second time in order
    // to handle described servers->variables in the OpenAPI spec.
    // E.G.:
    // servers:
    //   - url: 'https://api-sandbox.redocly.com/organizations/{organizationId}'
    // TODO: remove/update after the support of the described servers->variables in the Arazzo spec.
    resolvedPath = resolvePath(pathToFetch, pathParams) || '';
    if (!resolvedPath) {
      throw new Error('Path to fetch is undefined');
    }

    const startTime = performance.now();

    const result = await wrappedFetch(resolvedPath, {
      method: (method || 'get').toUpperCase() as OperationMethod,
      headers,
      ...(!isEmpty(requestBody) && {
        body: encodedBody,
      }),
      redirect: 'follow',
      signal: AbortSignal.timeout(MAX_FETCH_TIMEOUT),
      // Required for application/octet-stream content type requests
      ...(headers['content-type'] === 'application/octet-stream' && {
        duplex: 'half',
      }),
      dispatcher: ctx.mtlsCerts ? createMtlsClient(resolvedPath, ctx.mtlsCerts) : undefined,
    });
    const responseTime = Math.ceil(performance.now() - startTime);
    const res = await result.text();

    const [responseContentType] = result.headers.get('content-type')?.split(';') || [
      'application/json',
    ];
    const transformedBody = res
      ? isJsonContentType(responseContentType)
        ? JSON.parse(res)
        : res
      : {};
    const responseSchema = getResponseSchema({
      statusCode: result.status,
      contentType: responseContentType,
      descriptionResponses: openapiOperation?.responses,
    });

    collectSecretFields(ctx, responseSchema, transformedBody);

    const maskedResponseBody = isJsonContentType(responseContentType)
      ? maskSecrets(transformedBody, ctx.secretFields || new Set())
      : transformedBody;

    this.initVerboseResponseLogs({
      body: isJsonContentType(responseContentType)
        ? JSON.stringify(maskedResponseBody)
        : maskedResponseBody,
      method: (method || 'get') as OperationMethod,
      host: serverUrl.url,
      path: pathWithSearchParams || '',
      statusCode: result.status,
      responseTime,
    });

    return {
      body: transformedBody,
      statusCode: result.status,
      time: responseTime,
      header: Object.fromEntries(result.headers?.entries() || []),
      contentType: responseContentType,
      query: Object.fromEntries(searchParams.entries()),
      path: pathParams,
    };
  };
}
