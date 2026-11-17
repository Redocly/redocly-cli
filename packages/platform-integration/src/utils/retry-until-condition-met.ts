import { pause } from '@redocly/openapi-core';

/**
 * Retries an operation until a condition is met or a timeout is exceeded.
 * @param operation The operation to retry.
 * @param condition Checked after each result. Return false to keep retrying, true to stop.
 * @param onConditionNotMet Called with the last result before pausing and retrying.
 * @param startTime The start time of the operation. Default is the current time.
 * @param retryTimeoutMs The maximum time to retry the operation. Default is 10 minutes.
 * @param retryIntervalMs The interval between retries. Default is 5 seconds.
 */
export async function retryUntilConditionMet<T>({
  operation,
  condition,
  onConditionNotMet,
  startTime = Date.now(),
  retryTimeoutMs = 600000, // 10 min
  retryIntervalMs = 5000, // 5 sec
}: {
  operation: () => Promise<T>;
  condition: (result: T) => boolean;
  onConditionNotMet?: (lastResult: T) => void | Promise<void>;
  startTime?: number;
  retryTimeoutMs?: number;
  retryIntervalMs?: number;
}): Promise<T> {
  async function attempt(): Promise<T> {
    const result = await operation();

    if (condition(result)) {
      return result;
    }

    if (Date.now() - startTime > retryTimeoutMs) {
      throw new Error('Timeout exceeded.');
    }

    await onConditionNotMet?.(result);
    await pause(retryIntervalMs);

    return attempt();
  }

  return attempt();
}
