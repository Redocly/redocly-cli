import { outdent } from 'outdent';

import { parseYamlToDocument } from '../../../__tests__/utils.js';
import { detectSpec } from '../../detect-spec.js';
import { getTypes } from '../../oas-types.js';
import { BaseResolver, resolveDocument } from '../../resolve.js';
import { StatsAsync2, StatsAsync3, StatsOAS } from '../../rules/other/stats.js';
import { normalizeTypes } from '../../types/index.js';
import type {
  AsyncAPIStatsAccumulator,
  OASStatsAccumulator,
  SpecVendorExtensionsAccumulator,
} from '../../typings/common.js';
import { normalizeVisitors } from '../../visitors.js';
import { walkDocument } from '../../walk.js';
import { ensureSpecExtensionDispatch } from '../spec-extensions.js';

function createOasStatsAccumulator(): OASStatsAccumulator {
  return {
    refs: { metric: 'References', total: 0, color: 'red', items: new Set() },
    externalDocs: { metric: 'External Documents', total: 0, color: 'magenta' },
    schemas: { metric: 'Schemas', total: 0, color: 'white' },
    parameters: { metric: 'Parameters', total: 0, color: 'yellow', items: new Set() },
    links: { metric: 'Links', total: 0, color: 'cyan', items: new Set() },
    pathItems: { metric: 'Path Items', total: 0, color: 'green' },
    webhooks: { metric: 'Webhooks', total: 0, color: 'green' },
    operations: { metric: 'Operations', total: 0, color: 'yellow' },
    tags: { metric: 'Tags', total: 0, color: 'white', items: new Set() },
    xExtensions: { metric: 'Vendor Extensions', total: 0, color: 'cyan' },
  };
}

function createAsyncStatsAccumulator(): AsyncAPIStatsAccumulator {
  return {
    refs: { metric: 'References', total: 0, color: 'red', items: new Set() },
    externalDocs: { metric: 'External Documents', total: 0, color: 'magenta' },
    schemas: { metric: 'Schemas', total: 0, color: 'white' },
    parameters: { metric: 'Parameters', total: 0, color: 'yellow', items: new Set() },
    channels: { metric: 'Channels', total: 0, color: 'green' },
    operations: { metric: 'Operations', total: 0, color: 'yellow' },
    tags: { metric: 'Tags', total: 0, color: 'white', items: new Set() },
    xExtensions: { metric: 'Vendor Extensions', total: 0, color: 'cyan' },
  };
}

async function walkStats(yaml: string): Promise<OASStatsAccumulator | AsyncAPIStatsAccumulator> {
  const document = parseYamlToDocument(yaml, '');
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(getTypes(specVersion));
  ensureSpecExtensionDispatch(types);

  let statsVisitor;
  let statsAccumulator: OASStatsAccumulator | AsyncAPIStatsAccumulator;
  if (specVersion === 'async2' || specVersion === 'async3') {
    const asyncAccumulator = createAsyncStatsAccumulator();
    statsVisitor =
      specVersion === 'async2' ? StatsAsync2(asyncAccumulator) : StatsAsync3(asyncAccumulator);
    statsAccumulator = asyncAccumulator;
  } else {
    const oasAccumulator = createOasStatsAccumulator();
    statsVisitor = StatsOAS(oasAccumulator);
    statsAccumulator = oasAccumulator;
  }

  const visitors = normalizeVisitors(
    [{ severity: 'warn', ruleId: 'test', visitor: statsVisitor }],
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
  return statsAccumulator;
}

async function collect(yaml: string): Promise<SpecVendorExtensionsAccumulator> {
  return (await walkStats(yaml)).xExtensions.details ?? {};
}

const props = (acc: SpecVendorExtensionsAccumulator, name: string, prop: string) =>
  [...(acc[name]?.props[prop] ?? [])].sort();

describe('stats vendor extensions collection', () => {
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

    expect(Object.keys(acc)).toEqual(['x-badges', 'x-codeSamples']);
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

  it('should count a sibling extension on a later $ref to an already-visited target', async () => {
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
        /b:
          get:
            operationId: b
            responses:
              '200':
                $ref: '#/components/responses/Shared'
                x-second-ref-ext: true
      components:
        responses:
          Shared:
            description: ok
    `);

    expect(acc['x-second-ref-ext']?.count).toBe(1);
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

  it('should keep webhook and tag metrics while counting legacy x-webhooks', async () => {
    const stats = (await walkStats(outdent`
      openapi: 3.0.0
      info:
        title: t
        version: '1'
      paths: {}
      x-webhooks:
        newPet:
          post:
            tags:
              - pets
            responses:
              '200':
                description: ok
    `)) as OASStatsAccumulator;

    expect(stats.webhooks.total).toBe(1);
    expect(stats.tags.total).toBe(1);
    expect(stats.xExtensions.total).toBe(1);
    expect(stats.xExtensions.details?.['x-webhooks']?.count).toBe(1);
  });

  it('should keep operation and tag metrics while counting x-query', async () => {
    const stats = (await walkStats(outdent`
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
          x-query:
            operationId: q
            tags:
              - queries
            responses:
              '200':
                description: ok
    `)) as OASStatsAccumulator;

    expect(stats.operations.total).toBe(2);
    expect(stats.tags.total).toBe(1);
    expect(stats.xExtensions.details?.['x-query']?.count).toBe(1);
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

    it('should mask sensitive values by key and by value shape, keeping benign ones', async () => {
      const acc = await collect(outdent`
        openapi: 3.1.0
        info:
          title: t
          version: '1'
          x-auth-token: benign-but-key-is-sensitive
          x-gateway:
            apiKey: abc123
            authorization: Basic abc
            url: https://internal.corp/api
            contact: jane.doe@corp.com
            traceId: 4bf92f3577b34da6a3ce929d0e0e4736
            color: purple
      `);

      expect(props(acc, 'x-auth-token', '$value')).toEqual(['<masked>']);
      expect(props(acc, 'x-gateway', 'apiKey')).toEqual(['<masked>']);
      expect(props(acc, 'x-gateway', 'authorization')).toEqual(['<masked>']);
      expect(props(acc, 'x-gateway', 'url')).toEqual(['<masked>']);
      expect(props(acc, 'x-gateway', 'contact')).toEqual(['<masked>']);
      expect(props(acc, 'x-gateway', 'traceId')).toEqual(['<masked>']);
      expect(props(acc, 'x-gateway', 'color')).toEqual(['purple']);
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
});
