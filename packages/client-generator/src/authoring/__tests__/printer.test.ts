import { Printer } from '../printer.js';

describe('Printer', () => {
  it('builds indented blocks in any language without manual whitespace bookkeeping', () => {
    const writer = new Printer();
    writer.line('class Pet:').indent(() => {
      writer.line('def __init__(self):').indent(() => {
        writer.line('self.name = name');
      });
    });
    expect(writer.toString()).toBe('class Pet:\n  def __init__(self):\n    self.name = name\n');
  });

  it('block() without a close suits dedent-terminated languages (Python)', () => {
    const writer = new Printer('    ');
    writer.block('class Pet:', () => {
      writer.line('name: str');
    });
    writer.line('PETS = []');
    expect(writer.toString()).toBe('class Pet:\n    name: str\nPETS = []\n');
  });

  it('block() wraps open/body/close; blank() emits an empty line without indentation', () => {
    const writer = new Printer('    ');
    writer.block(
      'func main() {',
      () => {
        writer.line('run()');
        writer.blank();
        writer.line('done()');
      },
      '}'
    );
    expect(writer.toString()).toBe('func main() {\n    run()\n\n    done()\n}\n');
  });
});
