import { outdent } from 'outdent';

import { parseYamlToDocument } from '../../../../__tests__/utils.js';
import { detectSpec } from '../../../detect-spec.js';
import { getTypes } from '../../../oas-types.js';
import { BaseResolver, resolveDocument } from '../../../resolve.js';
import { normalizeTypes } from '../../../types/index.js';
import type { SpecVendorExtensionsAccumulator, StatsRow } from '../../../typings/common.js';
import { normalizeVisitors } from '../../../visitors.js';
import { walkDocument } from '../../../walk.js';
import { StatsSpecExtensions, applySpecExtensionsStats } from '../spec-extensions.js';

async function collect(yaml: string): Promise<SpecVendorExtensionsAccumulator> {
  const document = parseYamlToDocument(yaml, '');
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(getTypes(specVersion));
  const accumulator: SpecVendorExtensionsAccumulator = {};

  const visitors = normalizeVisitors(
    [{ severity: 'warn', ruleId: 'test', visitor: StatsSpecExtensions(accumulator) }],
    types
  );
  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver: new BaseResolver(),
  });
  walkDocument({
    rootType: types.Root,
    normalizedVisitors: visitors,
    resolvedRefMap,
    document,
    ctx: { problems: [], specVersion, visitorsData: {} },
  });
  return accumulator;
}

const props = (acc: SpecVendorExtensionsAccumulator, name: string, prop: string) =>
  [...(acc[name]?.props[prop] ?? [])].sort();

describe('StatsSpecExtensions', () => {
  it('should count every x- key, including extensions that have a declared type in core', async () => {
    const acc = await collect(outdent`
      openapi: 3.1.0
      info:
        title: t
        version: '1'
      paths:
        /a:
          get:
            operationId: a
            x-codeSamples:
              - lang: curl
                source: curl https://example.com
            x-badges:
              - name: Beta
                color: purple
            responses:
              '200':
                description: ok
    `);

    expect(acc['x-codeSamples']?.count).toBe(1);
    expect(acc['x-badges']?.count).toBe(1);
  });

  it('should not dedupe repeated scalar values across different nodes', async () => {
    const acc = await collect(outdent`
      openapi: 3.1.0
      info:
        title: t
        version: '1'
      paths:
        /a:
          get:
            operationId: a
            x-internal: true
            responses:
              '200':
                description: ok
        /b:
          get:
            operationId: b
            x-internal: true
            responses:
              '200':
                description: ok
    `);

    expect(acc['x-internal']?.count).toBe(2);
  });

  it('should count an extension on a $ref-shared node once', async () => {
    const acc = await collect(outdent`
      openapi: 3.1.0
      info:
        title: t
        version: '1'
      paths:
        /a:
          get:
            operationId: a
            parameters:
              - $ref: '#/components/parameters/Shared'
            responses:
              '200':
                description: ok
        /b:
          get:
            operationId: b
            parameters:
              - $ref: '#/components/parameters/Shared'
            responses:
              '200':
                description: ok
      components:
        parameters:
          Shared:
            name: p
            in: query
            x-hideReplay: true
            schema:
              type: string
    `);

    expect(acc['x-hideReplay']?.count).toBe(1);
  });

  it('should not descend into an extension value (no props-of-props)', async () => {
    const acc = await collect(outdent`
      openapi: 3.1.0
      info:
        title: t
        version: '1'
        x-outer:
          x-inner: 1
    `);

    expect(Object.keys(acc)).toEqual(['x-outer']);
    expect(props(acc, 'x-outer', 'x-inner')).toEqual(['1']);
  });

  it('should count an extension on a map-typed node (Paths)', async () => {
    const acc = await collect(outdent`
      openapi: 3.1.0
      info:
        title: t
        version: '1'
      paths:
        x-paths-ext: true
        /a:
          get:
            operationId: a
            responses:
              '200':
                description: ok
    `);

    expect(acc['x-paths-ext']?.count).toBe(1);
  });

  it('should not count map keys (schema/component names) that start with x-', async () => {
    const acc = await collect(outdent`
      openapi: 3.1.0
      info:
        title: t
        version: '1'
      paths:
        /a:
          get:
            operationId: a
            responses:
              '200':
                description: ok
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/Pet'
      components:
        schemas:
          x-MySchema:
            type: string
          Pet:
            type: object
            properties:
              x-trace-id:
                type: string
    `);

    // `x-MySchema` (component name) and `x-trace-id` (property name) are map keys, not extensions
    expect(acc['x-MySchema']).toBeUndefined();
    expect(acc['x-trace-id']).toBeUndefined();
  });

  it('should count an extension written next to a $ref', async () => {
    const acc = await collect(outdent`
      openapi: 3.1.0
      info:
        title: t
        version: '1'
      paths:
        /a:
          get:
            operationId: a
            responses:
              '200':
                $ref: '#/components/responses/Shared'
                x-sibling-ext: true
      components:
        responses:
          Shared:
            description: ok
    `);

    expect(acc['x-sibling-ext']?.count).toBe(1);
  });

  describe('value collection (describe)', () => {
    it('should keep short scalars but replace long strings with a length marker', async () => {
      const long = 'x'.repeat(80);
      const acc = await collect(outdent`
        openapi: 3.1.0
        info:
          title: t
          version: '1'
          x-short: hello
          x-long: ${long}
      `);

      expect(props(acc, 'x-short', '$value')).toEqual(['hello']);
      expect(props(acc, 'x-long', '$value')).toEqual(['<string:80>']);
    });

    it('should mark a $ref value as <ref> and an object/array as its type', async () => {
      const acc = await collect(outdent`
        openapi: 3.1.0
        info:
          title: t
          version: '1'
        paths:
          /a:
            get:
              operationId: a
              x-codeSamples:
                - lang: curl
                  source:
                    $ref: '#/x'
              responses:
                '200':
                  description: ok
      `);

      expect(props(acc, 'x-codeSamples', 'source')).toEqual(['<ref>']);
      expect(props(acc, 'x-codeSamples', 'lang')).toEqual(['curl']);
    });

    it('should collect the extension value under $value when it has no own props', async () => {
      const acc = await collect(outdent`
        openapi: 3.1.0
        info:
          title: t
          version: '1'
          x-flag: true
      `);

      expect(props(acc, 'x-flag', '$value')).toEqual(['true']);
    });
  });

  describe('cross-spec (AsyncAPI)', () => {
    it('should collect extensions across AsyncAPI 2.x nodes', async () => {
      const acc = await collect(outdent`
        asyncapi: 2.6.0
        info:
          title: t
          version: '1'
          x-info-ext: true
        channels:
          user/signedup:
            x-badges:
              - name: Beta
                color: purple
            subscribe:
              x-op-ext: true
              message:
                x-msg-ext: a
                payload:
                  type: object
      `);

      expect(acc['x-info-ext']?.count).toBe(1);
      expect(acc['x-badges']?.count).toBe(1);
      expect(acc['x-op-ext']?.count).toBe(1);
      expect(acc['x-msg-ext']?.count).toBe(1);
    });

    it('should collect extensions across AsyncAPI 3.x nodes', async () => {
      const acc = await collect(outdent`
        asyncapi: 3.0.0
        info:
          title: t
          version: '1'
        channels:
          userSignedup:
            x-channel-ext: 1
            address: user/signedup
            messages:
              m:
                x-msg-ext: a
                payload:
                  type: object
        operations:
          onSignup:
            x-op-ext: true
            action: receive
            channel:
              $ref: '#/channels/userSignedup'
      `);

      expect(acc['x-channel-ext']?.count).toBe(1);
      expect(acc['x-msg-ext']?.count).toBe(1);
      expect(acc['x-op-ext']?.count).toBe(1);
    });
  });

  describe('bounding (caps)', () => {
    it('should cap distinct values per prop at 20 and mark the overflow as <truncated>', async () => {
      const badges = Array.from({ length: 25 }, (_, i) => `      - color: c${i}`).join('\n');
      const acc = await collect(outdent`
        openapi: 3.1.0
        info:
          title: t
          version: '1'
        paths:
          /a:
            get:
              operationId: a
              x-badges:
        ${badges}
              responses:
                '200':
                  description: ok
      `);

      const values = acc['x-badges'].props.color;
      expect(values.size).toBe(21);
      expect(values.has('<truncated>')).toBe(true);
      expect(values.has('c0')).toBe(true);
    });

    it('should cap distinct props per extension at 20 and fold the rest under <truncated>', async () => {
      const keys = Array.from({ length: 25 }, (_, i) => `    k${i}: v${i}`).join('\n');
      const acc = await collect(outdent`
        openapi: 3.1.0
        info:
          title: t
          version: '1'
          x-metadata:
        ${keys}
      `);

      const propNames = Object.keys(acc['x-metadata'].props);
      expect(propNames).toHaveLength(21);
      expect(propNames).toContain('<truncated>');
    });
  });

  describe('applySpecExtensionsStats', () => {
    it('should set total to the distinct extension count and counts per extension', () => {
      const acc: SpecVendorExtensionsAccumulator = {
        'x-badges': { count: 3, props: {} },
        'x-internal': { count: 5, props: {} },
      };
      const row: StatsRow = { metric: 'Vendor Extensions', total: 0, color: 'cyan' };

      applySpecExtensionsStats(acc, row);

      expect(row.total).toBe(2);
      expect(row.counts).toEqual({ 'x-badges': 3, 'x-internal': 5 });
    });

    it('should sort extension names for a stable output', () => {
      const acc: SpecVendorExtensionsAccumulator = {
        'x-zeta': { count: 1, props: {} },
        'x-alpha': { count: 1, props: {} },
      };
      const row: StatsRow = { metric: 'Vendor Extensions', total: 0, color: 'cyan' };

      applySpecExtensionsStats(acc, row);

      expect(Object.keys(row.counts!)).toEqual(['x-alpha', 'x-zeta']);
    });
  });
});
