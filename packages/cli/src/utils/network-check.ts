import { DEFAULT_FETCH_TIMEOUT, OTEL_URL } from './constants.js';

export async function respondWithinMs(timeout: number = DEFAULT_FETCH_TIMEOUT): Promise<boolean> {
  try {
    const { fetchWithTimeout } = await import('./fetch-with-timeout.js');
    await fetchWithTimeout(OTEL_URL, { timeout });

    return true;
  } catch (error) {
    return false;
  }
}
