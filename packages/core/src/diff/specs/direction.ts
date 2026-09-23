import type { Direction } from '../types.js';

export function mergeDirections(a: Direction, b: Direction): Direction {
  if (a === b) return a;
  if (a === 'neutral') return b;
  if (b === 'neutral') return a;
  return 'both';
}

export function opposite(direction: Direction): Direction {
  if (direction === 'request') return 'response';
  if (direction === 'response') return 'request';
  return direction;
}
