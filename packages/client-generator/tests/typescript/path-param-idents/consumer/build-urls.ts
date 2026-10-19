import { configure, getWidget, getItem } from './client.ts';

const urls: string[] = [];
configure({
  fetch: (async (url: string) => {
    urls.push(url);
    return new Response('{"id":"x"}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch,
});

await getWidget({ path: { 'widget-id': 'abc' } });
await getItem({ path: { new: 'xyz' } });
console.log(JSON.stringify(urls));
