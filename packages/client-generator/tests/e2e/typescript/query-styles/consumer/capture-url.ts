import { search, configure } from './client.ts';
let captured = '';
configure({
  fetch: async (url) => {
    captured = String(url);
    return new Response('{"results":[]}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  },
});
await search({
  query: { tags: ['a', 'b'], q: ['x', 'y'], ids: ['1', '2'], filter: 'a/b', limit: 5 },
});
process.stdout.write(captured);
