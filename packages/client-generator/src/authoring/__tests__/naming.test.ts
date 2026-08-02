import { casing, identifierFor, RESERVED_WORDS } from '../naming.js';

describe('casing', () => {
  it('splits on delimiters and case boundaries, handling acronyms', () => {
    for (const input of ['order-item', 'order_item', 'orderItem', 'OrderItem', 'order item']) {
      expect(casing.camel(input)).toBe('orderItem');
      expect(casing.pascal(input)).toBe('OrderItem');
      expect(casing.snake(input)).toBe('order_item');
      expect(casing.screaming(input)).toBe('ORDER_ITEM');
    }
    expect(casing.snake('APIKey')).toBe('api_key');
    expect(casing.pascal('api_key_v2')).toBe('ApiKeyV2');
  });

  it('names signed numbers Plus*/Minus* so +1 and -1 stay distinct (GitHub reactions)', () => {
    expect(casing.pascal('+1')).toBe('Plus1');
    expect(casing.pascal('-1')).toBe('Minus1');
    expect(casing.snake('+1')).toBe('plus_1');
    expect(casing.screaming('-1')).toBe('MINUS_1');
    // A minus that is just a word delimiter is untouched.
    expect(casing.pascal('x-header')).toBe('XHeader');
  });
});

describe('identifierFor', () => {
  it('sanitizes invalid characters and leading digits, then applies the style', () => {
    expect(identifierFor('2nd-item', { style: 'snake' })).toBe('_2nd_item');
    expect(identifierFor('user.name', { style: 'camel' })).toBe('userName');
  });

  it('suffixes an underscore for reserved words of the target language', () => {
    expect(identifierFor('class', { style: 'snake', reserved: RESERVED_WORDS.python })).toBe(
      'class_'
    );
    expect(identifierFor('type', { style: 'camel', reserved: RESERVED_WORDS.go })).toBe('type_');
    expect(identifierFor('order', { style: 'camel', reserved: RESERVED_WORDS.python })).toBe(
      'order'
    );
    expect(identifierFor('class', { style: 'camel', reserved: RESERVED_WORDS.php })).toBe('class_');
    expect(identifierFor('list', { style: 'camel', reserved: RESERVED_WORDS.php })).toBe('list_');
    expect(identifierFor('echo', { style: 'camel', reserved: RESERVED_WORDS.php })).toBe('echo_');
  });
});
