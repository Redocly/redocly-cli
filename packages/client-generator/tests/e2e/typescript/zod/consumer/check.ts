// z.infer<typeof PageSchema> must be assignable to the sdk's Page type (schema ↔ type
// agreement). For `Page` (all-required scalars) the assignability is in fact bidirectional;
// this checks the z.infer → sdk direction, which the schema is expected to guarantee.
import type { z } from 'zod';

import type { Page } from './client.js';
import type { PageSchema } from './client.zod.js';
const _x: Page = {} as z.infer<typeof PageSchema>;
void _x;
