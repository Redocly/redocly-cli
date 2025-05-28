import { fetch } from 'undici';
import { bgRed, inverse } from 'colorette';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore this works but some types are not working
import concat from 'concat-stream';
import {
  type OperationMethod,
  type VerboseLog,
  type TestContext,
  type ResponseContext,
  type Step,
} from '../types.js';
import { withHar } from '../utils/har-logs/index.js';
import { isEmpty } from './is-empty.js';
import { resolvePath } from '../modules/context-parser/index.js';
import { getVerboseLogs, maskSecrets } from '../modules/cli-output/index.js';
import { getResponseSchema } from '../modules/description-parser/index.js';
import { collectSecretFields } from '../modules/flow-runner/index.js';
import { createMtlsClient } from './mtls/create-mtls-client.js';
import { DefaultLogger } from './logger/logger.js';
import { DEFAULT_RESPECT_MAX_FETCH_TIMEOUT } from '../consts.js';
import { parseWwwAuthenticateHeader } from './digest-auth/parse-www-authenticate-header.js';
import { generateDigestAuthHeader } from './digest-auth/generate-digest-auth-header.js';

import type { RequestData } from '../modules/flow-runner/index.js';

const logger = DefaultLogger.getInstance();

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

  updateVerboseLogs = (params: Partial<VerboseLog>) => {
    if (!this.verboseLogs) {
      throw new Error('Verbose logs not initialized');
    }
    this.verboseLogs = getVerboseLogs({
      ...this.verboseLogs,
      ...params,
    });
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

  fetchResult = async ({
    ctx,
    step,
    requestData,
    workflowId,
  }: {
    ctx: TestContext;
    step: Step;
    requestData: RequestData;
    workflowId: string;
  }): Promise<ResponseContext | never> => {
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

    if (Object.keys(cookies).length) {
      headers['cookie'] = Object.entries(cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
    }

    const resolvedPath = resolvePath(path, pathParams) || '';
    const pathWithSearchParams = `${resolvedPath}${
      searchParams.toString() ? '?' + searchParams.toString() : ''
    }`;
    const resolvedServerUrl = resolvePath(serverUrl.url, pathParams) || '';
    const urlToFetch = `${trimTrailingSlash(resolvedServerUrl)}${pathWithSearchParams}`;

    if (urlToFetch.startsWith('/')) {
      logger.error(
        bgRed(` Wrong url: ${inverse(urlToFetch)} `) +
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
      host: resolvedServerUrl,
      method: (method || 'get').toUpperCase() as OperationMethod,
      path: maskedPathParams || '',
      body: maskedBody,
    });

    const wrappedFetch = this.harLogs ? withHar(this.fetch, { har: this.harLogs }) : fetch;
    const startTime = performance.now();

    let fetchResult;
    let responseBody;
    let responseTime;

    const fetchParams = {
      method: (method || 'get').toUpperCase() as OperationMethod,
      headers,
      ...(!isEmpty(requestBody) && {
        body: encodedBody,
      }),
      redirect: 'follow',
      signal: AbortSignal.timeout(DEFAULT_RESPECT_MAX_FETCH_TIMEOUT),
      // Required for application/octet-stream content type requests
      ...(headers['content-type'] === 'application/octet-stream' && {
        duplex: 'half',
      }),
      dispatcher: ctx.mtlsCerts ? createMtlsClient(urlToFetch, ctx.mtlsCerts) : undefined,
    };

    const workflowLevelXSecurityParameters =
      ctx.workflows.find((workflow) => workflow.workflowId === workflowId)?.['x-security'] || [];
    const lastDigestSecurityScheme = [
      ...workflowLevelXSecurityParameters,
      ...(step['x-security'] || []),
    ]
      .reverse()
      .find((security) => {
        const scheme = security.schemeName
          ? openapiOperation?.securitySchemes?.[security.schemeName]
          : security.scheme;

        return scheme?.type === 'http' && scheme?.scheme === 'digest';
      });

    if (lastDigestSecurityScheme) {
      // FETCH WITH DIGEST AUTH
      // Digest auth perform two requests to establish the connection
      // We need to wait for the second request to complete before returning the response
      const first401Result = await wrappedFetch(urlToFetch, fetchParams);
      const body401 = await first401Result.text();
      const wwwAuthenticateHeader = first401Result.headers.get('www-authenticate');

      if (!wwwAuthenticateHeader) {
        this.initVerboseResponseLogs({
          body: body401,
          method: (method || 'get') as OperationMethod,
          host: serverUrl.url,
          path: pathWithSearchParams || '',
          statusCode: first401Result.status,
          responseTime: 0,
        });
        throw new Error('No www-authenticate header');
      }

      const { realm, nonce, opaque, qop, algorithm, cnonce, nc } =
        parseWwwAuthenticateHeader(wwwAuthenticateHeader);
      const { username, password } = lastDigestSecurityScheme.values;
      const uri = new URL(urlToFetch).pathname + new URL(urlToFetch).search;

      const digestAuthHeader = generateDigestAuthHeader({
        username: username as string,
        password: password as string,
        realm,
        nonce,
        opaque,
        qop,
        algorithm,
        cnonce,
        nc,
        uri,
        method: (method || 'get').toUpperCase(),
        bodyContent: JSON.stringify(encodedBody) || '',
      });

      const updatedHeaders = {
        ...headers,
        authorization: digestAuthHeader,
      };

      // Update the request headers in the step
      const stepRequest = ctx.$workflows[workflowId].steps[step.stepId]?.request;
      if (stepRequest) {
        stepRequest.header = updatedHeaders;
      }

      this.updateVerboseLogs({
        headerParams: maskSecrets(updatedHeaders, ctx.secretFields || new Set()),
      });

      fetchResult = await wrappedFetch(urlToFetch, {
        ...fetchParams,
        headers: updatedHeaders,
      });

      responseTime = Math.ceil(performance.now() - startTime);
      responseBody = await fetchResult.text();
    } else {
      // REGULAR FETCH
      fetchResult = await wrappedFetch(urlToFetch, fetchParams);
      responseTime = Math.ceil(performance.now() - startTime);
      responseBody = await fetchResult.text();
    }

    if (!fetchResult) {
      throw new Error('Failed to fetch, no result received');
    }

    const [responseContentType] = fetchResult.headers.get('content-type')?.split(';') || [
      'application/json',
    ];
    const transformedBody = responseBody
      ? isJsonContentType(responseContentType)
        ? JSON.parse(responseBody)
        : responseBody
      : {};
    const responseSchema = getResponseSchema({
      statusCode: fetchResult.status,
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
      statusCode: fetchResult.status,
      responseTime,
    });

    return {
      body: transformedBody,
      statusCode: fetchResult.status,
      time: responseTime,
      header: Object.fromEntries(fetchResult.headers?.entries() || []),
      contentType: responseContentType,
      requestUrl: urlToFetch,
    };
  };
}
