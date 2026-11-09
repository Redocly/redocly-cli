/** True when `deadline` (epoch milliseconds) has passed; never true without a deadline. */
export function hasExecutionTimedOut(deadline: number | undefined): boolean {
  return deadline !== undefined && Date.now() >= deadline;
}

/** `retryAfter` in seconds, shortened so that the wait ends at `deadline`. */
export function retryWaitSeconds(retryAfter: number, deadline: number | undefined): number {
  if (deadline === undefined) return retryAfter;
  return Math.min(retryAfter, Math.max(deadline - Date.now(), 0) / 1000);
}
