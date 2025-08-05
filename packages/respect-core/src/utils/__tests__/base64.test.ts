import { arrayBufferToBase64 } from '../base64.js';

describe('arrayBufferToBase64', () => {
  it('should convert ArrayBuffer to base64 string', () => {
    // Test with simple string "Hello, World!"
    const testString = 'Hello, World!';
    const encoder = new TextEncoder();
    const arrayBuffer = encoder.encode(testString).buffer;

    const result = arrayBufferToBase64(arrayBuffer);

    // "Hello, World!" in base64 is "SGVsbG8sIFdvcmxkIQ=="
    expect(result).toBe('SGVsbG8sIFdvcmxkIQ==');
  });

  it('should handle empty ArrayBuffer', () => {
    const emptyBuffer = new ArrayBuffer(0);
    const result = arrayBufferToBase64(emptyBuffer);
    expect(result).toBe('');
  });

  it('should handle binary data', () => {
    // Create a simple binary pattern
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xff]);
    const result = arrayBufferToBase64(bytes.buffer);

    // This should produce a valid base64 string
    expect(result).toBe('AAECAw8=');
  });
});
