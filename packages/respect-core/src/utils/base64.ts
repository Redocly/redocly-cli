import { isBrowser } from '@redocly/openapi-core';

/**
 * Converts an ArrayBuffer to base64 string in a cross-platform way
 * Works in Node.js, browser, and Tauri environments
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (isBrowser) {
    // Browser environment - use built-in btoa with Uint8Array
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } else {
    // Node.js environment - use Buffer
    return Buffer.from(buffer).toString('base64');
  }
}
