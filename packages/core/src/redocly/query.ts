import fetch from 'node-fetch';

const GRAPHQL_ENDPOINT = process.env.REDOCLY_DOMAIN
  ? `https://api.${process.env.REDOCLY_DOMAIN}/graphql`
  : 'https://api.redoc.ly/graphql';

export async function query(query: string, variables = {}, headers = {}): Promise<any> {
  headers = {
    ...headers,
    'Content-Type': 'application/json',
  };

  const gQLResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!gQLResponse.ok) {
    throw new GqlRequestError(`Failed to execute query: ${gQLResponse.status}`);
  }

  const response = await gQLResponse.json();
  if (response.errors && response.errors.length) {
    throw new GqlRequestError(`Query failed: ${response.errors[0].message}`);
  }

  return response.data;
}

export class GqlRequestError extends Error {
  constructor(message: string) {
    super(message);
  }
}
