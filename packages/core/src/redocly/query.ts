import fetch from 'node-fetch';

export async function query(
  query: string,
  redoclyDomain: string,
  variables = {},
  headers = {},
): Promise<any> {
  headers = {
    ...headers,
    'Content-Type': 'application/json',
  };

  const graphQlEndpoint = `https://api.${redoclyDomain}/graphql`
  const gQLResponse = await fetch(graphQlEndpoint, {
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
