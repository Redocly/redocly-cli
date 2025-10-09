import type { VerboseLog } from '../../types.js';

export function getVerboseLogs({
  headerParams,
  path,
  method,
  host,
  body,
  statusCode,
  responseTime,
  responseSize,
}: VerboseLog): VerboseLog {
  const verboseLogs: VerboseLog = {
    path,
    method,
    host,
  };

  if (headerParams && Object.keys(headerParams).length > 0) {
    verboseLogs.headerParams = headerParams;
  }
  if (
    body &&
    (body instanceof FormData ||
      body instanceof File ||
      body instanceof ArrayBuffer ||
      Object.keys(body).length > 0)
  ) {
    verboseLogs.body = body;
  }

  if (statusCode) {
    verboseLogs.statusCode = statusCode;
  }

  if (responseTime) {
    verboseLogs.responseTime = responseTime;
  }

  if (responseSize) {
    verboseLogs.responseSize = responseSize;
  }

  return verboseLogs;
}
