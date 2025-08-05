import { isBrowser } from '@redocly/openapi-core';

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (isBrowser) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } else {
    return Buffer.from(buffer).toString('base64');
  }
}
