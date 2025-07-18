import fetchWithTimeout, { DEFAULT_FETCH_TIMEOUT } from './fetch-with-timeout.js';
import { OTEL_URL } from './constants.js';

/**
 * Checks if the system has internet connectivity by attempting to reach a reliable endpoint
 * @param timeout - Timeout in milliseconds for the connectivity check
 * @returns Promise<boolean> - true if internet is available, false otherwise
 */
export async function hasInternetConnectivity(
  timeout: number = DEFAULT_FETCH_TIMEOUT
): Promise<boolean> {
  try {
    await fetchWithTimeout(OTEL_URL, {
      method: 'GET',
      timeout,
    });

    return true;
  } catch (error) {
    // Any error (network, timeout, etc.) indicates no connectivity
    return false;
  }
}
