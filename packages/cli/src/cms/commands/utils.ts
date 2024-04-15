export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * This function retries an operation until a condition is met or a timeout is exceeded.
 * If the condition is not met within the timeout, an error is thrown.
 * @operation The operation to retry.
 * @condition The condition to check after each operation result.
 * @param onConditionNotMet Will be called with the last result right after checking condition and before timeout and retrying.
 * @param onRetry Will be called right before retrying operation with the last result before retrying.
 */
export async function retryUntilConditionMet<T>({
  operation,
  condition,
  onConditionNotMet,
  onRetry,
  // onTimeOutExceeded,
  startTime = Date.now(),
  retryTimeoutMs = 600000, // 10 min
  retryIntervalMs = 5000, // 5 sec
}: {
  operation: () => Promise<T>;
  condition: (result: T) => boolean;
  onConditionNotMet?: (lastResult: T) => void;
  onRetry?: (lastResult: T) => void;
  startTime?: number; // = Date.now();
  retryTimeoutMs?: number; // 10 min
  retryIntervalMs?: number; // 5 sec
}): Promise<T> {
  async function attempt(): Promise<T> {
    const result = await operation();

    if (condition(result)) {
      return result;
    } else if (Date.now() - startTime > retryTimeoutMs) {
      throw new Error('Timeout exceeded');
    } else {
      onConditionNotMet?.(result);
      await wait(retryIntervalMs);
      onRetry?.(result);
      return attempt();
    }
  }

  return attempt();
}
