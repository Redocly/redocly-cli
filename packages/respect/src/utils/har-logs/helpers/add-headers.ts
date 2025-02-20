export function addHeaders(oldHeaders: any, newHeaders: any): any {
  if (!oldHeaders) {
    return newHeaders;
  } else if (typeof oldHeaders.set === 'function' && typeof oldHeaders.constructor === 'function') {
    const Headers = oldHeaders.constructor;
    const headers = new Headers(oldHeaders);
    for (const name in newHeaders) {
      headers.set(name, newHeaders[name]);
    }
    return headers;
  } else {
    return Object.assign({}, oldHeaders, newHeaders);
  }
}
