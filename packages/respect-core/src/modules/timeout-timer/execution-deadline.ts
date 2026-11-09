export function hasExecutionTimedOut(deadline: number | undefined): boolean {
  return deadline !== undefined && Date.now() >= deadline;
}

export function retryWaitSeconds(retryAfter: number, deadline: number | undefined): number {
  if (deadline === undefined) return retryAfter;
  return Math.min(retryAfter, Math.max(deadline - Date.now(), 0) / 1000);
}
