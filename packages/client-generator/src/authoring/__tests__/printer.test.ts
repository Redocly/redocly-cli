import { Printer } from '../printer.js';

describe('Printer', () => {
  it('builds indented blocks in any language without manual whitespace bookkeeping', () => {
    const printer = new Printer();
    printer.line('class Pet:').indent(() => {
      printer.line('def __init__(self):').indent(() => {
        printer.line('self.name = name');
      });
    });
    expect(printer.toString()).toBe('class Pet:\n  def __init__(self):\n    self.name = name\n');
  });

  it('block() without a close suits dedent-terminated languages (Python)', () => {
    const printer = new Printer('    ');
    printer.block('class Pet:', () => {
      printer.line('name: str');
    });
    printer.line('PETS = []');
    expect(printer.toString()).toBe('class Pet:\n    name: str\nPETS = []\n');
  });

  it('block() wraps open/body/close; blank() emits an empty line without indentation', () => {
    const printer = new Printer('    ');
    printer.block(
      'func main() {',
      () => {
        printer.line('run()');
        printer.blank();
        printer.line('done()');
      },
      '}'
    );
    expect(printer.toString()).toBe('func main() {\n    run()\n\n    done()\n}\n');
  });
});
