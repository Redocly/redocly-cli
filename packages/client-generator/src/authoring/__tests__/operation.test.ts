import type { ServerModel } from '../../intermediate-representation/model.js';
import { serverUrlParts } from '../operation.js';

describe('serverUrlParts', () => {
  it('splits a template into literals and declared variables, in order', () => {
    const server = {
      url: 'https://{region}.api.example.com/{basePath}',
      variables: [
        { name: 'region', default: 'us' },
        { name: 'basePath', default: 'v1' },
      ],
    } as ServerModel;
    expect(serverUrlParts(server)).toEqual([
      { kind: 'literal', value: 'https://' },
      { kind: 'variable', name: 'region' },
      { kind: 'literal', value: '.api.example.com/' },
      { kind: 'variable', name: 'basePath' },
    ]);
  });

  it('keeps an undeclared placeholder as literal text, and never returns zero parts', () => {
    const undeclared = {
      url: 'https://{region}.example.com',
      variables: [],
    } as unknown as ServerModel;
    expect(serverUrlParts(undeclared)).toEqual([
      { kind: 'literal', value: 'https://{region}.example.com' },
    ]);
    const empty = { url: '', variables: [] } as unknown as ServerModel;
    expect(serverUrlParts(empty)).toEqual([{ kind: 'literal', value: '' }]);
  });
});
