import { CodeWriter } from '../code-writer.js';

describe('CodeWriter', () => {
  it('builds indented blocks in any language without manual whitespace bookkeeping', () => {
    const writer = new CodeWriter();
    writer.line('class Pet:').indent(() => {
      writer.line('def __init__(self):').indent(() => {
        writer.line('self.name = name');
      });
    });
    expect(writer.toString()).toBe('class Pet:\n  def __init__(self):\n    self.name = name\n');
  });

  it('block() wraps open/body/close; blank() emits an empty line without indentation', () => {
    const writer = new CodeWriter('    ');
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
