// The generated client, plus schemas from a validation library the built-ins do not cover.
// Both come from one description and one `redocly generate-client` run.
import * as v from 'valibot';

import { listMenuItems } from './api/client.js';
import { MenuItemListSchema, type MenuItemList } from './api/client.valibot.js';

const menu: MenuItemList = await listMenuItems();

// The client already types this value from the description. The schema checks it at run
// time, which is what catches a server that has drifted from the description.
const checked = v.parse(MenuItemListSchema, menu);
console.log(`${checked.items?.length ?? 0} items`);

// `v.safeParse` for the non-throwing shape, the same as any hand-written Valibot code.
const result = v.safeParse(MenuItemListSchema, { items: 'not an array' });
if (!result.success) console.log(`rejected: ${result.issues[0].message}`);
