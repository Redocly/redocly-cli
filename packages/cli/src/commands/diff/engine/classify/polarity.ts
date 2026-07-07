import type { Polarity } from '../types.js';
import { getComponentRoot, type UsageIndex } from './usage.js';

// Stable pointers are '#/'-prefixed with '/'-separated segments; identity keys never
// contain a raw '/' (escaped in node-identity.ts), so plain splitting is safe.
function segmentsOf(pointer: string): string[] {
  return pointer.replace(/^#\//, '').split('/');
}

export function getPolarity(pointer: string, usage: UsageIndex): Polarity {
  const segments = segmentsOf(pointer);
  if (segments.includes('callbacks') || segments.includes('webhooks')) return 'neutral';
  if (segments[0] === 'components') {
    const root = getComponentRoot(pointer);
    if (!root) return 'neutral';
    return usage.polarityOf(root, getSitePolarity);
  }
  return getSitePolarity(pointer);
}

function getSitePolarity(pointer: string): Polarity {
  const segments = segmentsOf(pointer);
  if (segments.includes('callbacks') || segments.includes('webhooks')) return 'neutral';
  if (segments.includes('responses')) return 'response';
  if (segments.includes('parameters') || segments.includes('requestBody')) return 'request';
  return 'neutral';
}
