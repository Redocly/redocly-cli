import type { VerboseLog } from '../../types.js';

export function getVerboseLogs({
  headerParams,
  path,
  method,
  host,
  body,
  statusCode,
  responseTime,
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
    ((!(body instanceof FormData) && Object.keys(body).length > 0) || body instanceof FormData)
  ) {
    verboseLogs.body = body;
  }

  if (statusCode) {
    verboseLogs.statusCode = statusCode;
  }

  if (responseTime) {
    verboseLogs.responseTime = responseTime;
  }

  return verboseLogs;
}
