import { DEFAULT_FETCH_TIMEOUT, OTEL_URL } from './constants.js';
import fetchWithTimeout from './fetch-with-timeout.js';

export async function respondWithinMs(timeout: number = DEFAULT_FETCH_TIMEOUT): Promise<boolean> {
  try {
    await fetchWithTimeout(OTEL_URL, { timeout });

    return true;
  } catch (error) {
    return false;
  }
}
