import { printExpected, printReceived } from '../../../flow-runner/index.js';

describe('printExpected', () => {
  it('should print expected', () => {
    // check encoded color of the text
    expect(printExpected('expected')).toBe('[32m"expected"[39m');
  });

  it('should print expected', () => {
    expect(printExpected({})).toBe('[32m{}[39m');
  });
});

describe('printReceived', () => {
  it('should print received', () => {
    expect(printReceived('received')).toBe('[31m"received"[39m');
  });

  it('should print received', () => {
    expect(printReceived({})).toBe('[31m{}[39m');
  });
});
