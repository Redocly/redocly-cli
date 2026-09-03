import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
const testPath = join(__dirname, 'node-type-multi-file');

describe('node-type', () => {
  test('node-type should list every node of a multi-file description', async () => {
    const args = getParams(indexEntryPoint, ['node-type', 'openapi.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('node-type should resolve a pointer into a referenced file', () => {
    const args = getParams(indexEntryPoint, [
      'node-type',
      'openapi.yaml',
      '--pointer=parameters/limit.yaml#/schema',
    ]);
    expect(getCommandOutput(args, { testPath }).trim()).toBe('Schema');
  });

  test('node-type should resolve a pointer at a $ref whose target was already visited', () => {
    const args = getParams(indexEntryPoint, [
      'node-type',
      'openapi.yaml',
      '--pointer=#/paths/~1bar/get/parameters/0',
    ]);
    expect(getCommandOutput(args, { testPath }).trim()).toBe('Parameter');
  });

  test('node-type should suggest the closest node when the pointer matches nothing', () => {
    const args = getParams(indexEntryPoint, ['node-type', 'openapi.yaml', '--pointer=#/paths/foo']);
    const result = getCommandOutput(args, { testPath });
    expect(result).toContain('No node at #/paths/foo.');
    expect(result).toContain('The closest node is Paths at #/paths.');
    expect(result).toContain('#/paths/~1foo');
  });

  test('node-type should fail when the pointed file is not referenced', () => {
    const args = getParams(indexEntryPoint, [
      'node-type',
      'openapi.yaml',
      '--pointer=unreferenced.yaml#/foo',
    ]);
    expect(getCommandOutput(args, { testPath })).toContain(
      'make sure the file is referenced from openapi.yaml'
    );
  });

  test('node-type should list only the nodes of the given type', () => {
    const args = getParams(indexEntryPoint, ['node-type', 'openapi.yaml', '--type=Schema']);
    expect(getCommandOutput(args, { testPath }).trim()).toBe(
      'Schema  parameters/limit.yaml#/schema'
    );
  });

  test('node-type should fail when no node has the given type', () => {
    const args = getParams(indexEntryPoint, ['node-type', 'openapi.yaml', '--type=Unknown']);
    expect(getCommandOutput(args, { testPath })).toContain("No nodes of type 'Unknown'.");
  });

  test('node-type should show the chain of types down to a $ref-ed node', () => {
    const args = getParams(indexEntryPoint, [
      'node-type',
      'openapi.yaml',
      '--pointer=parameters/limit.yaml#/schema',
      '--parents',
    ]);
    // Both paths that $ref the same parameter file pass through the same types, so one line.
    expect(getCommandOutput(args, { testPath }).trim()).toBe(
      'Root → Paths → PathItem → Operation → ParameterList → Parameter → Schema'
    );
  });

  test('node-type should list the distinct chains that lead to a type', () => {
    const args = getParams(indexEntryPoint, [
      'node-type',
      'openapi.yaml',
      '--type=Parameter',
      '--parents',
    ]);
    expect(getCommandOutput(args, { testPath }).trim()).toBe(
      'Root → Paths → PathItem → Operation → ParameterList'
    );
  });

  test('node-type should require a pointer or a type for --parents', () => {
    const args = getParams(indexEntryPoint, ['node-type', 'openapi.yaml', '--parents']);
    expect(getCommandOutput(args, { testPath })).toContain(
      'The --parents option requires --pointer or --type.'
    );
  });

  test('node-type should summarize the types used in the description', async () => {
    const args = getParams(indexEntryPoint, ['node-type', 'openapi.yaml', '--summary']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'summary-snapshot.txt'));
  });
});
