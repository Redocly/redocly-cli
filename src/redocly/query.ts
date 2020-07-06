import fetch from 'node-fetch';

const GRAPHQL_ENDPOINT = process.env.REDOCLY_DOMAIN
  ? `https://api.${process.env.REDOCLY_DOMAIN}/graphql` : 'https://api.redoc.ly/graphql';

export default async function query(queryString: string, variables = {}, headers = {}, debugInfo = ''):Promise<any> {
  // eslint-disable-next-line no-param-reassign
  headers = {
    ...headers,
    'Content-Type': 'application/json',
  };

  const gQLResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: queryString,
      variables,
    }),
  });


  if (!gQLResponse.ok) {
    throw new RequestError(`Failed to execute query: ${gQLResponse.status}`, 500, debugInfo);
  }

  const response = await gQLResponse.json();
  if (response.errors && response.errors.length) {
    throw new RequestError(`Query failed: ${response.errors[0].message}`, 500, debugInfo);
  }

  return response.data;
}

export class RequestError extends Error {
  statusCode: number;
  debugInfo: string;

  constructor(message:string, statusCode = 500, debugInfo = '') {
    super(message);
    this.statusCode = statusCode;
    this.debugInfo = debugInfo;
  }
}
