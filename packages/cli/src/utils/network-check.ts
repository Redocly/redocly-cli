import { DEFAULT_FETCH_TIMEOUT } from './fetch-with-timeout.js';

/**
 * Checks if the system has internet connectivity by attempting to reach a reliable endpoint
 * @param timeout - Timeout in milliseconds for the connectivity check
 * @returns Promise<boolean> - true if internet is available, false otherwise
 */
export async function hasInternetConnectivity(
  timeout: number = DEFAULT_FETCH_TIMEOUT
): Promise<boolean> {
  // Skip network check if explicitly disabled
  if (process.env.REDOCLY_OFFLINE === 'true' || process.env.CI === 'true') {
    return false;
  }

  try {
    // Use a reliable endpoint for connectivity check
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch('https://otel.cloud.redocly.com', {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    // Any error (network, timeout, etc.) indicates no connectivity
    return false;
  }
}
