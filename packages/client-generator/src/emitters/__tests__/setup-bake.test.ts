import { outdent } from 'outdent';

import { bakeSetup } from '../setup-bake.js';

const FILE = outdent`
  import { defineClientSetup, type RequestContext } from '@redocly/client-generator';
  export default defineClientSetup({
    config: { serverUrl: 'https://api.acme.com', retry: { retries: 3 } },
    middleware: [{ onRequest: (ctx: RequestContext) => { ctx.headers['X-Acme'] = '1'; } }],
  });
`;

describe('bakeSetup', () => {
  it('returns the setup expression with the package import stripped', () => {
    const out = bakeSetup(FILE);
    expect(out).not.toContain("from '@redocly/client-generator'");
    expect(out).not.toContain('defineClientSetup');
    expect(out).toContain("serverUrl: 'https://api.acme.com'");
    expect(out).toContain("ctx.headers['X-Acme'] = '1'");
    // No facade-specific application — that is the emitter's job.
    expect(out).not.toContain('configure(');
    expect(out).not.toContain('use(');
  });

  it('rejects a setup file importing anything but @redocly/client-generator', () => {
    expect(() => bakeSetup(`import x from 'axios';\nexport default x;`)).toThrow(
      /may only import from "@redocly\/client-generator"/
    );
  });

  it('errors when there is no default export', () => {
    expect(() => bakeSetup(`const x = 1;`)).toThrow(/export default/);
  });

  it('accepts a bare default-exported object (no defineClientSetup wrapper)', () => {
    const out = bakeSetup(`export default { config: { serverUrl: 'https://x' } };`);
    expect(out).toBe("{ config: { serverUrl: 'https://x' } }");
  });

  it('wraps file-level helper declarations in an IIFE so they are preserved and scoped', () => {
    const out = bakeSetup(outdent`
      import { defineClientSetup } from '@redocly/client-generator';
      const VERSION = '9.9';
      export default defineClientSetup({ config: { headers: { 'X-V': VERSION } } });
    `);
    expect(out.startsWith('(() => {')).toBe(true);
    expect(out).toContain("const VERSION = '9.9'");
    expect(out).toContain("'X-V': VERSION");
    expect(out).toContain('return ');
  });
});
