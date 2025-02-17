import { formatCliInputs } from '../../../flow-runner';

describe('formatCliInputs', () => {
  it('should return empty object if input is undefined', () => {
    expect(formatCliInputs(undefined)).toEqual({});
  });

  it('should return empty object if input is empty string', () => {
    expect(formatCliInputs('')).toEqual({});
  });

  it('should return empty object if input is empty array', () => {
    expect(formatCliInputs([])).toEqual({});
  });

  it('should return object with key value pair if input is string', () => {
    expect(formatCliInputs('key=value')).toEqual({ key: 'value' });
  });

  it('should return object with key value pair if input is array with multiple elements', () => {
    expect(formatCliInputs(['key1=value1', 'key2=value2'])).toEqual({
      key1: 'value1',
      key2: 'value2',
    });
  });

  it('should return empty object when string without = sign provided', () => {
    expect(formatCliInputs('test')).toEqual({});
  });

  it('should return parsed object when stringify object provided', () => {
    expect(formatCliInputs('{"firstname":"John", "lastname":"Wick"}')).toEqual({
      firstname: 'John',
      lastname: 'Wick',
    });
  });

  it('should return object with key value pair if input is string with comma separated key value pairs', () => {
    expect(formatCliInputs('key1=value1,key2=value2')).toEqual({ key1: 'value1', key2: 'value2' });
  });
});
