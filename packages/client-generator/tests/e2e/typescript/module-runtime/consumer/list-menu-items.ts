import { ApiError, listMenuItems } from './client.js';

const items = await listMenuItems({});
console.log(JSON.stringify({ ok: Array.isArray(items.items), viaApiError: typeof ApiError }));
