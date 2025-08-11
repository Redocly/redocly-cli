import { isBinaryContentType } from '../binary-content-type-checker.js';

describe('isBinaryContentType', () => {
  it('should return true for binary content types', () => {
    expect(isBinaryContentType('application/octet-stream')).toBe(true);
    expect(isBinaryContentType('application/pdf')).toBe(true);
    expect(isBinaryContentType('image/png')).toBe(true);
    expect(isBinaryContentType('image/jpeg')).toBe(true);
    expect(isBinaryContentType('audio/mpeg')).toBe(true);
    expect(isBinaryContentType('video/mp4')).toBe(true);
    expect(isBinaryContentType('application/zip')).toBe(true);
    expect(isBinaryContentType('application/x-zip-compressed')).toBe(true);
    expect(isBinaryContentType('application/gzip')).toBe(true);
    expect(isBinaryContentType('application/x-gzip')).toBe(true);
    expect(isBinaryContentType('application/x-bzip2')).toBe(true);
    expect(isBinaryContentType('application/x-tar')).toBe(true);
    expect(isBinaryContentType('application/x-rar-compressed')).toBe(true);
    expect(isBinaryContentType('application/x-7z-compressed')).toBe(true);
    expect(
      isBinaryContentType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    ).toBe(true);
    expect(isBinaryContentType('application/vnd.ms-excel')).toBe(true);
    expect(isBinaryContentType('application/vnd.ms-powerpoint')).toBe(true);
    expect(isBinaryContentType('application/msword')).toBe(true);
    expect(isBinaryContentType('application/x-shockwave-flash')).toBe(true);
    expect(isBinaryContentType('application/x-font-ttf')).toBe(true);
    expect(isBinaryContentType('font/woff2')).toBe(true);
  });

  it('should return false for non-binary content types', () => {
    expect(isBinaryContentType('application/json')).toBe(false);
    expect(isBinaryContentType('text/plain')).toBe(false);
    expect(isBinaryContentType('text/html')).toBe(false);
    expect(isBinaryContentType('application/xml')).toBe(false);
    expect(isBinaryContentType('text/xml')).toBe(false);
    expect(isBinaryContentType('application/javascript')).toBe(false);
    expect(isBinaryContentType('text/css')).toBe(false);
  });
});
