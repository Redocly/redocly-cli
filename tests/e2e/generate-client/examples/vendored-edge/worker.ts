// vendored-edge — the generated client as a VENDORED artifact.
//
// `src/api/client.ts` was generated once and copied in. It imports nothing, so
// the same file runs anywhere web-standard `fetch` exists — Cloudflare Workers,
// Deno Deploy, Bun, a browser — with no package.json dependencies and no
// node_modules at runtime. This is an edge-style handler (the
// `export default { fetch }` shape) proxying the upstream cafe API through the
// vendored client; `typescript` is the only dev tool here, and only to type-check.
import { ApiError, client } from './src/api/client.js';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/menu') {
        const menu = await client.listMenuItems({
          params: { search: url.searchParams.get('search') ?? undefined },
        });
        return Response.json(menu.items);
      }
      const photo = url.pathname.match(/^\/photo\/(?<menuItemId>[^/]+)$/);
      if (photo?.groups) {
        const image = await client.getMenuItemPhoto({
          menuItemId: photo.groups.menuItemId,
          params: { photoSize: 'thumbnail' },
        });
        return image instanceof Blob
          ? new Response(image, { headers: { 'content-type': image.type } })
          : new Response(image);
      }
      return new Response('Not found', { status: 404 });
    } catch (error) {
      // The upstream's error body passes through with its status; anything else is a 502.
      if (error instanceof ApiError) return Response.json(error.body, { status: error.status });
      return new Response('Upstream unavailable', { status: 502 });
    }
  },
};
