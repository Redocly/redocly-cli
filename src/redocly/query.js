import { XMLHttpRequest } from 'xmlhttprequest';

const GRAPHQL_ENDPOINT = 'http://localhost:3100/graphql';

export default function query(queryString, variables = {}, headers = {}, debugInfo = '') {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', GRAPHQL_ENDPOINT, false);
  xhr.setRequestHeader('Content-Type', 'application/json');
  for (const header of Object.keys(headers)) {
    xhr.setRequestHeader(header, headers[header]);
  }

  xhr.send(JSON.stringify({
    query: queryString,
    variables,
  }));

  if (xhr.status !== 200) {
    throw new RequestError(`Failed to execute query: ${xhr.responseText}`, 500, debugInfo);
  }

  const response = JSON.parse(xhr.responseText);
  if (response.errors && response.errors.length) {
    throw new RequestError(`Query failed: ${response.errors[0].message}`, 500, debugInfo);
  }

  return response.data;
}

export class RequestError extends Error {
  constructor(message, statusCode = 500, debugInfo = '') {
    super(message);
    this.statusCode = statusCode;
    this.debugInfo = debugInfo;
  }
}
