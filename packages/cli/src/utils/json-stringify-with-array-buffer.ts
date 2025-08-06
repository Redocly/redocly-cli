export function jsonStringifyWithArrayBuffer(obj: any, space?: string | number): string {
  return JSON.stringify(
    obj,
    (key, value) => {
      if (value instanceof ArrayBuffer) {
        // Convert ArrayBuffer to base64 string for JSON serialization
        const uint8Array = new Uint8Array(value);
        const base64 = Buffer.from(uint8Array).toString('base64');
        return {
          __type: 'ArrayBuffer',
          data: base64,
          byteLength: value.byteLength,
        };
      }

      if (value instanceof File) {
        // Convert File to a serializable object - avoid accessing properties to prevent errors
        return {
          __type: 'File',
          name: value.name || '[File Object]',
          size: value.size || 0,
          type: value.type || '',
          lastModified: value.lastModified || 0,
        };
      }

      return value;
    },
    space
  );
}
