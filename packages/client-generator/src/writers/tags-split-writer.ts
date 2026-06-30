import { buildTaggedClient } from './tagged.js';
import type { Writer } from './types.js';

/**
 * `tags-split` mode: a `<tag>/<stem>.ts` folder per OpenAPI tag (untagged →
 * `default/<stem>.ts`), with the shared `<stem>.http.ts` and `<stem>.schemas.ts`
 * at the root and a `<stem>.ts` barrel entry. Schemas stay shared at the root
 * (they are not partitioned per tag).
 */
export const tagsSplitWriter: Writer = (input) => buildTaggedClient(input, true);
