import { toFormData } from '../multipart.js';

describe('toFormData', () => {
  it('serializes fields per the port rules', () => {
    const fd = toFormData({
      file: new Blob(['x']),
      name: 'n',
      when: new Date('2026-01-02T03:04:05Z'),
      tags: ['a', 'b'],
      meta: { k: 'v' },
      price: 42,
      skip: undefined,
      gone: null,
    });
    expect(fd.get('file')).toBeInstanceOf(Blob);
    expect(fd.get('name')).toBe('n');
    expect(fd.get('when')).toBe('2026-01-02T03:04:05.000Z');
    expect(fd.getAll('tags')).toEqual(['a', 'b']);
    expect(fd.get('meta')).toBe('{"k":"v"}');
    expect(fd.get('price')).toBe('42');
    expect(fd.has('skip')).toBe(false);
    expect(fd.has('gone')).toBe(false);
  });

  it('skips null/undefined items inside arrays', () => {
    const fd = toFormData({ tags: ['a', null, undefined, 'b'] });
    expect(fd.getAll('tags')).toEqual(['a', 'b']);
  });
});
