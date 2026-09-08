import { GoPrinter, exported } from '../go.js';
import { PhpPrinter } from '../php.js';
import { PythonPrinter } from '../python.js';
import { TypeScriptPrinter } from '../typescript.js';

// The check that the abstraction is real: four printers fill the same slots, each with
// its language's answer — not a bag of leftovers (ADR-0021).

describe('naming slots', () => {
  it('python: pascal types, snake members that report a rename, screaming consts', () => {
    const py = new PythonPrinter();
    expect(py.typeName('order-item')).toBe('OrderItem');
    expect(py.memberName('petType')).toEqual({ identifier: 'pet_type', renamed: true });
    expect(py.memberName('class')).toEqual({ identifier: 'class_', renamed: true });
    expect(py.constName('in-progress')).toBe('IN_PROGRESS');
    expect(py.identifiers(['id', 'id'], ['body'])).toEqual(['id', 'id_2']);
  });

  it('go: the digit-leading N rule — a `_` prefix would make the field unexported', () => {
    const go = new GoPrinter();
    expect(go.typeName('3ds')).toBe('N3ds');
    expect(exported('order-item')).toBe('OrderItem');
    expect(go.identifiers(['get-user', 'getUser'])).toEqual(['GetUser', 'GetUser2']);
    expect(go.packageName('My API!')).toBe('myapi');
    expect(go.packageName('42')).toBe('client');
  });

  it('php and typescript keep their conventions', () => {
    const php = new PhpPrinter();
    expect(php.typeName('order item')).toBe('OrderItem');
    expect(php.memberName('list')).toBe('list_');
    const ts = new TypeScriptPrinter();
    expect(ts.identifier('foo(){};evil()')).toBe('foo_____evil__');
    expect(ts.key('valid')).toBe('valid');
    expect(ts.key('not-valid')).toBe('"not-valid"');
    expect(ts.identifiers(['a-b', 'a.b'])).toEqual(['a_b', 'a_b_2']);
  });
});

describe('string slots — each language a real policy, not JSON by coincidence', () => {
  const HOSTILE = 'it\'s "x"\n\t\\ €😀';

  it('python: escapes controls, keeps non-ASCII raw, spells a lone surrogate', () => {
    const py = new PythonPrinter();
    expect(py.string(HOSTILE)).toBe('"it\'s \\"x\\"\\n\\t\\\\ €😀"');
    expect(py.string('\u0000')).toBe('"\\x00"');
    expect(py.string('\ud83d')).toBe('"\\ud83d"'); // lone surrogate stays representable
  });

  it('go: same shape, but a lone surrogate has no Go spelling and becomes U+FFFD', () => {
    const go = new GoPrinter();
    expect(go.string(HOSTILE)).toBe('"it\'s \\"x\\"\\n\\t\\\\ €😀"');
    expect(go.string('\ud83d')).toBe('"\\uFFFD"');
  });

  it('typescript: the merged, stricter policy — U+2028/29 AND </script> breakouts', () => {
    const ts = new TypeScriptPrinter();
    expect(ts.string('a\u2028b')).toBe('"a\\u2028b"');
    expect(ts.string('</script>')).toBe('"\\u003C/script\\u003E"');
  });

  it('php: quotes and backslashes, single-quoted', () => {
    expect(new PhpPrinter().string("it's \\")).toBe("'it\\'s \\\\'");
  });
});

describe('doc slots', () => {
  it('python: one-line and multi-line docstring forms', () => {
    const py = new PythonPrinter();
    py.doc('One line.');
    py.doc('First.\n\nSecond.');
    expect(py.toString()).toBe('"""One line."""\n"""First.\n\nSecond.\n"""\n');
  });

  it('go: consecutive blank comment lines collapse, the way gofmt rewrites them', () => {
    const go = new GoPrinter();
    go.doc('Thing', 'Summary.\n\n\n\nMore.');
    expect(go.toString()).toBe('// Thing — Summary.\n//\n// More.\n');
  });

  it('php: the @tag form when tags exist, one line otherwise', () => {
    const php = new PhpPrinter();
    php.doc('items', 'The items.', ['@return array<int, Order>']);
    expect(php.toString()).toContain(' * @return array<int, Order>');
  });

  it('typescript: a star-slash in spec text cannot terminate the comment', () => {
    const ts = new TypeScriptPrinter();
    ts.doc('evil */ alert(1) /*');
    expect(ts.toString()).toContain('evil *\\/ alert(1) /*');
  });
});

describe('layout', () => {
  it('go: toString applies column alignment and the gofmt whitespace shape', () => {
    const go = new GoPrinter();
    go.block(
      'type X struct {',
      () => {
        go.line('Id int64 `json:"id"`');
        go.line('LongerName string `json:"longerName"`');
      },
      '}'
    );
    go.blank();
    go.blank();
    const out = go.toString();
    expect(out).toContain('\tId         int64  `json:"id"`');
    expect(out).toContain('\tLongerName string `json:"longerName"`');
    expect(out.endsWith('}\n')).toBe(true); // trailing blanks trimmed
  });
});
