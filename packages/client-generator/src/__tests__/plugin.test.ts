import {
  operationSignature,
  pascalCase,
  printStatements,
  safeIdent,
  schemaToTypeNode,
  ts,
} from '../codegen.js';
import { type CustomGenerator, defineGenerator } from '../plugin.js';

describe('plugin entry', () => {
  it('defineGenerator returns its argument unchanged', () => {
    const gen: CustomGenerator = { name: 'route-map', requires: ['sdk'], run: () => [] };
    expect(defineGenerator(gen)).toBe(gen);
  });

  it('re-exports the codegen toolkit the built-in generators use', () => {
    // Value re-exports are reachable and usable from the public entry.
    expect(typeof ts.factory).toBe('object');
    expect(typeof printStatements).toBe('function');
    expect(typeof operationSignature).toBe('function');
    expect(typeof schemaToTypeNode).toBe('function');
    expect(pascalCase('pet')).toBe('Pet');
    expect(safeIdent('123')).not.toBe('123');
  });
});
