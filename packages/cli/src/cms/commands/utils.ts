export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * This function retries an operation until a condition is met or a timeout is exceeded.
 * If the condition is not met within the timeout, an error is thrown.
 * @returns
 */
export async function retryUntilConditionMet<T>({
  operation,
  condition,
  startTime = Date.now(),
  retryTimeoutMs = 600000, // 10 min
  retryIntervalMs = 5000, // 5 sec
  onRetry,
  onTimeOutExceeded,
}: {
  operation: () => Promise<T>;
  condition: (result: T) => boolean;
  startTime?: number; // = Date.now();
  retryTimeoutMs?: number; // 10 min
  retryIntervalMs?: number; // 5 sec
  onRetry?: (lastResult: T) => void;
  onTimeOutExceeded?: () => void;
}): Promise<T> {
  async function attempt(): Promise<T> {
    const result = await operation();

    if (condition(result)) {
      return result;
    } else if (Date.now() - startTime > retryTimeoutMs) {
      onTimeOutExceeded?.();
      throw new Error('Timeout exceeded');
    } else {
      onRetry?.(result);
      await wait(retryIntervalMs);
      return attempt();
    }
  }

  return attempt();
}
