export const OTEL_URL = 'https://otel.cloud.redocly.com';
export const OTEL_TRACES_URL = process.env.OTEL_TRACES_URL || `${OTEL_URL}/v1/traces`;
export const DEFAULT_FETCH_TIMEOUT = 3000;
export const ANONYMOUS_ID_CACHE_FILE = 'redocly-cli-anonymous-id';
