import { parseYaml } from '@redocly/openapi-core';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outdent } from 'outdent';

import { generateClient } from '../index.js';

const SPEC = outdent`
  openapi: 3.1.0
  info: { title: t, version: '1' }
  servers: [{ url: https://api.example.com }]
  paths:
    /pets:
      get:
        operationId: listPets
        responses:
          '200':
            description: ok
            content:
              application/json:
                schema:
                  type: object
                  properties:
                    items: { type: array, items: { type: string } }
`;

type Overlay = {
  overlay: string;
  actions: Array<{ target: string; update: Record<string, unknown> }>;
};

describe('codeSamples', () => {
  it('emits an OpenAPI Overlay of x-codeSamples collected from generators that implement sample()', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'code-samples-'));
    try {
      await writeFile(join(dir, 'openapi.yaml'), SPEC);
      await generateClient({
        api: join(dir, 'openapi.yaml'),
        output: join(dir, 'client.ts'),
        codeSamples: true,
      });
      const overlay = parseYaml(
        await readFile(join(dir, 'client.code-samples.yaml'), 'utf-8')
      ) as Overlay;
      expect(overlay.overlay).toBe('1.0.0');
      const action = overlay.actions.find((a) => a.target === "$.paths['/pets'].get")!;
      const samples = action.update['x-codeSamples'] as Array<Record<string, string>>;
      expect(samples[0]).toMatchObject({ lang: 'typescript' });
      expect(samples[0].source).toContain('listPets');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('imports the module each generator actually writes, not a hardcoded name', async () => {
    // A snippet that imports `client` is wrong for every stem the languages rewrite:
    // `openapi.client.ts` becomes `openapi_client.py`, and Go qualifies with `goPackage`.
    const dir = await mkdtemp(join(tmpdir(), 'code-samples-module-'));
    try {
      await writeFile(join(dir, 'openapi.yaml'), SPEC);
      await generateClient({
        api: join(dir, 'openapi.yaml'),
        output: join(dir, 'openapi.client.ts'),
        generators: ['typescript', 'python', 'go', 'php'],
        goPackage: 'cafe',
        codeSamples: true,
      });
      const overlay = parseYaml(
        await readFile(join(dir, 'openapi.client.code-samples.yaml'), 'utf-8')
      ) as Overlay;
      const samples = overlay.actions.find((action) => action.target === "$.paths['/pets'].get")!
        .update['x-codeSamples'] as Array<Record<string, string>>;
      const sourceOf = (lang: string) => samples.find((sample) => sample.lang === lang)!.source;

      expect(sourceOf('typescript')).toContain("from './openapi.client.js'");
      expect(sourceOf('python')).toContain('from openapi_client import Client');
      expect(sourceOf('php')).toContain("require 'openapi.client.php'");
      expect(sourceOf('go')).toContain('cafe.New(cafe.Config{})');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('emits no overlay file when codeSamples is off', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'code-samples-off-'));
    try {
      await writeFile(join(dir, 'openapi.yaml'), SPEC);
      await generateClient({ api: join(dir, 'openapi.yaml'), output: join(dir, 'client.ts') });
      await expect(readFile(join(dir, 'client.code-samples.yaml'), 'utf-8')).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
