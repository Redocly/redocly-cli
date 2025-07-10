import { buildParams } from '../../../../../commands/respect/har-logs/helpers/build-params.js';

describe('buildParams', () => {
  it('should parse url-encoded form data into HAR params format', () => {
    const urlEncodedData = 'name=test&colors=red&colors=blue';

    const result = buildParams(urlEncodedData);

    expect(result).toEqual([
      { name: 'name', value: 'test' },
      { name: 'colors', value: 'red' },
      { name: 'colors', value: 'blue' },
    ]);
  });

  it('should handle single values', () => {
    const urlEncodedData = 'single=value';

    const result = buildParams(urlEncodedData);

    expect(result).toEqual([{ name: 'single', value: 'value' }]);
  });

  it('should handle empty string', () => {
    const result = buildParams('');

    expect(result).toEqual([]);
  });
});
