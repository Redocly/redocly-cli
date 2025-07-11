/* istanbul ignore file */

// Forked from:
// https://github.com/exogen/node-fetch-har
// Changes made:
// - Allow to pass body as FormData
// - removed nanoid and replaced with crypto.randomUUID
// - migrated to be used with undici

import { URL } from 'url';
import { Client, type fetch } from 'undici';
import { addHeaders } from './helpers/add-headers.js';
import { getDuration } from './helpers/get-duration.js';
import { buildRequestCookies } from './helpers/build-request-cookies.js';
import { buildHeaders } from './helpers/build-headers.js';
import { buildResponseCookies } from './helpers/build-response-cookies.js';

const HAR_HEADER_NAME = 'x-har-request-id';
const harEntryMap = new Map<string, any>();
export interface WithHar {
  <T extends typeof fetch>(baseFetch: T, defaults?: any): T;
  harEntryMap?: Map<string, any>;
}

export const withHar: WithHar = function <T extends typeof fetch>(
  baseFetch: any,
  defaults: any = {}
): T {
  withHar.harEntryMap = harEntryMap;
  return async function fetch(input: any, options: any = {}): Promise<any> {
    const {
      har = defaults.har,
      harPageRef = defaults.harPageRef,
      onHarEntry = defaults.onHarEntry,
    } = options;

    if (har === false) {
      return baseFetch(input, options);
    }

    const requestId = crypto.randomUUID();
    const startTime = process.hrtime();

    const url = new URL(typeof input === 'string' ? input : input.url);

    const entry = {
      _compressed: false,
      _resourceType: 'fetch',
      _timestamps: {
        start: startTime,
        socket: startTime,
        lookup: startTime,
        connect: startTime,
        secureConnect: startTime,
        sent: startTime,
        firstByte: startTime,
        received: startTime,
      },
      timings: {
        blocked: -1,
        dns: -1,
        connect: -1,
        send: 0,
        wait: 0,
        receive: 0,
        ssl: -1,
      },
      time: 0,
      startedDateTime: new Date().toISOString(),
      cache: {
        beforeRequest: null,
        afterRequest: null,
      },
      request: {
        method: options.method || 'GET',
        url: url.href,
        cookies: buildRequestCookies(options.headers || {}),
        headers: buildHeaders(options.headers || {}),
        queryString: [...url.searchParams].map(([name, value]) => ({
          name,
          value,
        })),
        headersSize: -1,
        bodySize: -1,
        postData: {},
        httpVersion: 'HTTP/1.1',
      },
      response: {},
      pageref: '',
    };

    // Replace the Dispatcher initialization with Client
    const client = options.dispatcher || new Client(url.origin);

    // Listen to Undici dispatcher events
    client.on('connect', () => (entry._timestamps.connect = process.hrtime()));

    // Pass the dispatcher in options
    options = Object.assign({}, options, {
      headers: addHeaders(options.headers, { [HAR_HEADER_NAME]: requestId }),
      dispatcher: client, // Use client as dispatcher
    });

    harEntryMap.set(requestId, entry);

    // Update sent time just before the request
    entry._timestamps.sent = process.hrtime();

    // Make the request
    const response = await baseFetch(input, options);

    // Need to clone response to get both text and arrayBuffer
    const responseClone = response.clone();

    // Update firstByte time when we get the response
    entry._timestamps.firstByte = process.hrtime();

    // Get the response body and update received time
    const text = await response.text();
    entry._timestamps.received = process.hrtime();

    const harEntry = harEntryMap.get(requestId);
    harEntryMap.delete(requestId);

    if (!harEntry) {
      return response;
    }

    // Add response info
    if (!harEntry.response) {
      harEntry.response = {};
    }

    // Calculate total bytes of headers including the double CRLF before body
    const headerLines = [...response.headers.entries()].map(([name, value]) => `${name}: ${value}`);
    const statusLine = `HTTP/1.1 ${response.status} ${response.statusText}`;
    const headerBytes = Buffer.byteLength(
      statusLine + '\r\n' + headerLines.join('\r\n') + '\r\n\r\n'
    );
    harEntry._compressed = /^(gzip|compress|deflate|br)$/.test(
      response.headers.get('content-encoding') || ''
    );

    if (!harEntry.response.content) {
      harEntry.response.content = {
        size: -1,
      };
    }

    if (harEntry._compressed) {
      const rawBody = await responseClone.arrayBuffer();
      harEntry.response.content.size = rawBody.byteLength;
    } else {
      harEntry.response.content.size = text ? Buffer.byteLength(text) : -1;
    }
    const bodySize = text ? Buffer.byteLength(text) : -1;

    harEntry.response = {
      headers: buildHeaders(response.headers),
      cookies: buildResponseCookies(response.headers),
      status: response.status,
      statusText: response.statusText || '',
      httpVersion: response.httpVersion ? `HTTP/${response.httpVersion}` : 'HTTP/1.1',
      redirectURL: response.headers.location || '',
      content: {
        size:
          harEntry._compressed && harEntry.response.content.size !== -1
            ? harEntry.response.content.size
            : Buffer.byteLength(text),
        mimeType: response.headers.get('content-type') || '',
        text,
        compression:
          harEntry._compressed && harEntry.response.content.size !== -1
            ? harEntry.response.content.size - bodySize
            : 0,
      },
      bodySize,
      headersSize: headerBytes,
    };

    // Calculate timings
    const { _timestamps: time } = harEntry;
    harEntry.timings = {
      blocked: Math.max(getDuration(time.start, time.socket), 0.01),
      dns: -1,
      connect: Math.max(getDuration(time.lookup, time.connect), -1),
      ssl: time.secureConnect ? Math.max(getDuration(time.connect, time.secureConnect), -1) : -1,
      send: getDuration(time.secureConnect || time.connect, time.sent),
      wait: Math.max(getDuration(time.sent, time.firstByte), 0),
      receive: getDuration(time.firstByte, time.received),
    };

    // Calculate total time
    harEntry.time = getDuration(time.start, time.received);

    const parents = [];
    let child = harEntry;
    do {
      const parent = child._parent;
      delete child._parent;
      if (parent) {
        parents.unshift(parent);
      }
      child = parent;
    } while (child);

    // Allow grouping by pages.
    entry.pageref = harPageRef || 'page_1';
    parents.forEach((parent) => {
      parent.pageref = entry.pageref;
    });

    const Response =
      defaults.Response || baseFetch.Response || global.Response || response.constructor;
    const responseCopy = new Response(text, {
      status: response.statusCode,
      statusText: response.statusText || '',
      headers: response.headers,
      url: response.url,
    });
    responseCopy.harEntry = entry;

    if (har && typeof har === 'object') {
      har.log.entries.push(...parents, entry);
    }

    if (onHarEntry) {
      parents.forEach((parent) => {
        onHarEntry(parent);
      });
      onHarEntry(entry);
    }

    return responseCopy;
  } as T;
};
