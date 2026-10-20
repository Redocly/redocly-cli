import {
  client,
  configure,
  getBasic,
  getBearer,
  getCookie,
  getHeader,
  getQuery,
} from './client.js';

configure({ serverUrl: process.argv[2] });

// Each operation sends only the credential of the scheme it requires.
client.auth.bearer(async () => 'tok');
client.auth.basic('alice', 'pw');
client.auth.apiKey('QueryKey', 'secret-key');
client.auth.apiKey('CookieKey', 'cookie value');
client.auth.apiKey('HeaderKey', 'header-key');

await getBearer();
await getBasic();
await getQuery({ query: { limit: 5 } });
await getCookie();
await getHeader();
