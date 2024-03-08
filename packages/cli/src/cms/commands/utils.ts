export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryUntilConditionMet<T>({
  operation,
  condition,
  retryTimeout = 600000, // 10 min
  retryInterval = 5000, // 5 sec
  onRetry,
}: {
  operation: () => Promise<T>;
  condition: (result: T) => boolean;
  retryTimeout?: number; // 10 min
  retryInterval?: number; // 5 sec
  onRetry?: (lastResult: T) => void;
}): Promise<T> {
  const startTime = Date.now();

  async function attempt(): Promise<T> {
    const result = await operation();

    if (condition(result)) {
      return result;
    } else if (Date.now() - startTime > retryTimeout) {
      throw new Error('Timeout exceeded');
    } else {
      onRetry?.(result);
      await wait(retryInterval);
      return attempt();
    }
  }

  return attempt();
}
