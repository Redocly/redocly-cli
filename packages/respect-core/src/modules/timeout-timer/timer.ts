import { RESPECT_TIMEOUT } from '../../consts';

export function isTimedOut(startedAt: number) {
  const elapsedTime = performance.now() - startedAt;
  const timeout = parseInt(process.env.RESPECT_TIMEOUT || RESPECT_TIMEOUT.toString(), 10);
  return elapsedTime >= timeout;
}
