import { createHash } from 'node:crypto';

const DEFAULT_ALGORITHM = 'MD5';
const DEFAULT_NC = '00000001';

type DigestAuthType = {
  username?: string;
  password?: string;
  method: string;
  uri: string;
  realm?: string;
  nonce?: string;
  opaque?: string;
  qop?: string;
  algorithm?: string;
  nc?: string;
  cnonce?: string;
};

type RequiredDigestAuthParams = {
  username: string;
  password: string;
  realm: string;
  nonce: string;
  qop: string;
  opaque: string;
  uri: string;
  method: string;
};

export function generateDigestAuthHeader({
  username,
  password,
  nonce,
  realm,
  cnonce,
  algorithm = DEFAULT_ALGORITHM,
  qop,
  nc = DEFAULT_NC,
  opaque,
  uri,
  method,
  bodyContent = '',
}: DigestAuthType & { uri: string; method: string; bodyContent?: string }) {
  const requiredParams = {
    username,
    password,
    realm,
    nonce,
    qop,
    opaque,
    uri,
    method,
  };

  const missingParams = Object.entries(requiredParams)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingParams.length > 0) {
    throw new Error(`Missing required digest auth parameters: ${missingParams.join(', ')}`);
  }

  const response = generateResponse({
    ...(requiredParams as RequiredDigestAuthParams),
    cnonce,
    algorithm,
    nc,
    bodyContent,
  });

  const parts = [
    `username="${username}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${uri}"`,
    `qop=${qop}`,
    `nc=${nc}`,
    `cnonce="${cnonce}"`,
    `response="${response}"`,
    `algorithm=${algorithm}`,
  ];

  if (opaque) {
    parts.push(`opaque="${opaque}"`);
  }

  return `Digest ${parts.join(', ')}`;
}

export function generateResponse(
  data: RequiredDigestAuthParams & {
    cnonce?: string;
    algorithm?: string;
    nc?: string;
    bodyContent: string;
  }
) {
  const {
    username,
    password,
    realm,
    nonce,
    cnonce,
    algorithm = DEFAULT_ALGORITHM,
    qop,
    nc = DEFAULT_NC,
    uri,
    method,
    bodyContent,
  } = data;

  const hashA1 = algorithm.endsWith('-sess')
    ? getHashFunction(algorithm)
        .update(
          getHashFunction(algorithm).update(`${username}:${realm}:${password}`).digest('hex') +
            `:${nonce}:${cnonce}`
        )
        .digest('hex')
    : getHashFunction(algorithm).update(`${username}:${realm}:${password}`).digest('hex');

  const hashA2 = qop.includes('auth-int')
    ? getHashFunction(algorithm)
        .update(`${method}:${uri}:${getHashFunction(algorithm).update(bodyContent).digest('hex')}`)
        .digest('hex')
    : getHashFunction(algorithm).update(`${method}:${uri}`).digest('hex');

  return getHashFunction(algorithm)
    .update(`${hashA1}:${nonce}:${nc}:${cnonce}:${qop}:${hashA2}`)
    .digest('hex');
}

function getHashFunction(algorithm: string) {
  const normalizedAlgorithm = algorithm.replace('-sess', '').toUpperCase();

  switch (normalizedAlgorithm) {
    case 'SHA-256':
      return createHash('sha256');
    default:
      return createHash('md5');
  }
}
