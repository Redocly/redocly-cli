export const existsSync = vi.fn();
export const readFileSync = vi.fn(() => '');
export const statSync = vi.fn(() => ({ size: 0 }));
export const createReadStream = vi.fn();
export const writeFileSync = vi.fn();
export const mkdirSync = vi.fn();
