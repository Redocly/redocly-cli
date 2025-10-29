import { describe, it, expect } from 'vitest';
import { validateMountPath } from '../validate-mount-path.js';

describe('validateMountPath', () => {
  it('should accept valid mount path', () => {
    expect(validateMountPath('/docs')).toBe('/docs');
    expect(validateMountPath('/api/v1')).toBe('/api/v1');
    expect(validateMountPath('/my-path')).toBe('/my-path');
  });

  it('should reject empty mount path', () => {
    expect(() => validateMountPath('')).toThrow(
      'Mount path cannot be empty or root path. Please use --mount-path option with a valid path.'
    );
  });

  it('should reject root path "/"', () => {
    expect(() => validateMountPath('/')).toThrow(
      'Mount path cannot be empty or root path. Please use --mount-path option with a valid path.'
    );
  });
});
