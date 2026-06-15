import { buildTaggedClient } from './tagged.js';
import type { Writer } from './types.js';

/**
 * `tags` mode: shared `<stem>.http.ts` + `<stem>.schemas.ts`, one `<tag>.ts`
 * endpoints file per OpenAPI tag (untagged → `default.ts`), and a `<stem>.ts`
 * barrel that re-exports every tag file, the schemas, and the public setters.
 */
export const tagsWriter: Writer = (input) => buildTaggedClient(input, false);
