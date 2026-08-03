// multi-instance — one generated module, many isolated client instances.
//
// The generated file exports the raw wiring — the `OPERATIONS` descriptors and the
// `Ops`/`OperationId`/`OperationPath`/`OperationTag` types — alongside its default
// `client`. With `runtime: package`, `createClient` is imported from
// `@redocly/client-generator`, so an app can build one instance per tenant, each
// with its own `serverUrl`, credentials, and middleware — nothing is module-global.
//
// (The generated module exports `createClient` in BOTH runtimes, so the same
// pattern works with the default `inline` mode too — this example uses
// `runtime: package` to also demonstrate importing the factory from the package.)
import { createClient } from '@redocly/client-generator';

import {
  OPERATIONS,
  type OperationId,
  type OperationPath,
  type OperationTag,
  type Ops,
} from './api/client.js';

const out = document.querySelector<HTMLPreElement>('#out')!;
const log: string[] = [];

// A canned transport that echoes WHICH tenant was addressed and AS WHOM, so the
// per-instance isolation is visible in the output (and the example runs offline).
const canned = (async (url: string, init: RequestInit) => {
  const { host, pathname } = new URL(url);
  const headers = init.headers as Record<string, string>;
  const tenant = host.split('.')[0];
  log.push(`${init.method} ${host}${pathname} — ${headers['Authorization'] ?? 'anonymous'}`);
  const project = { id: `prj_${tenant}_1`, name: `${tenant} website` };
  return init.method === 'POST'
    ? new Response(JSON.stringify({ ...project, ...JSON.parse(String(init.body)) }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    : new Response(JSON.stringify({ items: [project] }), {
        headers: { 'content-type': 'application/json' },
      });
}) as unknown as typeof fetch;

// The per-tenant factory: same descriptors, isolated config. The type parameters
// carry the generated literal unions into `ctx.operation` for middleware targeting.
function tenantClient(tenant: string, token: string) {
  const instance = createClient<Ops, OperationId, OperationPath, OperationTag>(OPERATIONS, {
    serverUrl: `https://${tenant}.api.example.com`,
    fetch: canned,
  });
  instance.auth.bearer(token); // per-instance credentials — no shared auth state
  return instance;
}

const acme = tenantClient('acme', 'acme-token');
const globex = tenantClient('globex', 'globex-token');

// Middleware is per-instance too: only globex requests carry the tier header.
globex.use({
  onRequest: (ctx) => {
    ctx.headers['X-Tenant-Tier'] = 'enterprise';
  },
});

async function main() {
  const [acmeProjects, globexProjects] = await Promise.all([
    acme.listProjects(),
    globex.listProjects(),
  ]);
  const created = await acme.createProject({ body: { name: 'Launch site' } });
  out.textContent = [
    ...log,
    '',
    JSON.stringify({ acmeProjects, globexProjects, created }, null, 2),
  ].join('\n');
}

void main();
