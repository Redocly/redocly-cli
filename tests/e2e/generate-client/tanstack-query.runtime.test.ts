/** @vitest-environment jsdom */
//
// Tier-3 runtime React-hook integration for the tanstack-query generator.
//
// MECHANISM (documented choice): we generate `sdk,tanstack-query` into a fixed,
// checked-in consumer dir (`tanstack-consumer/`) and dynamic-`import()` the
// generated `client.tanstack.ts` directly — vite transforms it and resolves its
// `./client.js` import to the sibling `.ts` reliably (verified). The data is
// driven by a STUBBED `fetch` installed via the generated sdk's `configure()`
// (no mock server): the tanstack `queryFn` forwards to the sdk operation
// function, which uses that fetch. This proves the real React render path —
// `renderHook` + `QueryClientProvider` + `useQuery(getXOptions(vars))` — fires
// the queryFn and resolves the hook with the canned data, without mock-server
// flakiness or cross-process plumbing.

import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement, type ReactNode } from 'react';

import { generate } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const consumerDir = join(__dirname, 'tanstack-consumer');
const sdkFile = join(consumerDir, 'client.ts');
const tanstackFile = join(consumerDir, 'client.tanstack.ts');

const PET = { id: 1, name: 'rex', status: 'available' as const };

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function newClient(): QueryClient {
  // Retries off so a query/mutation settles deterministically within the test.
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe('generate-client tanstack-query runtime (React hooks, jsdom)', () => {
  beforeAll(() => {
    for (const f of [sdkFile, tanstackFile]) {
      if (existsSync(f)) rmSync(f, { force: true });
    }
    generate(join(__dirname, 'fixtures', 'base.yaml'), sdkFile, [
      '--generator',
      'sdk',
      '--generator',
      'tanstack-query',
    ]);
    expect(existsSync(tanstackFile)).toBe(true);
  });

  afterAll(() => {
    for (const f of [sdkFile, tanstackFile]) {
      if (existsSync(f)) rmSync(f, { force: true });
    }
  });

  it('useQuery(getPetByIdOptions(vars)) fires the queryFn and resolves with the response data', async () => {
    const sdk = await import(join(consumerDir, 'client.ts'));
    const mod = await import(join(consumerDir, 'client.tanstack.ts'));

    sdk.configure({
      fetch: (input: RequestInfo | URL) => {
        // The sdk built the URL from the path param; assert the queryFn forwarded it.
        expect(String(input)).toContain('/pets/1');
        return Promise.resolve(
          new Response(JSON.stringify(PET), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      },
    });

    const { result } = renderHook(() => useQuery(mod.getPetByIdOptions({ id: 1 })), {
      wrapper: wrapper(newClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(PET);
  }, 30_000);

  it('useMutation(createPetMutation()) fires the mutationFn and resolves with the created resource', async () => {
    const sdk = await import(join(consumerDir, 'client.ts'));
    const mod = await import(join(consumerDir, 'client.tanstack.ts'));

    sdk.configure({
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        expect(init?.method).toBe('POST');
        return Promise.resolve(
          new Response(JSON.stringify(PET), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      },
    });

    const { result } = renderHook(
      () =>
        useMutation<unknown, Error, { body: { name: string; status: string } }>(
          mod.createPetMutation()
        ),
      { wrapper: wrapper(newClient()) }
    );

    const created = await result.current.mutateAsync({
      body: { name: 'rex', status: 'available' },
    });
    expect(created).toEqual(PET);
  }, 30_000);
});
