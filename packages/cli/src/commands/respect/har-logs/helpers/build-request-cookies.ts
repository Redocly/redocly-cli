import * as cookie from 'cookie';

export function buildRequestCookies(headers: any): any[] {
  const cookies: any[] = [];
  for (const [header, headerValue] of Object.entries(headers)) {
    if (header.toLowerCase() === 'cookie') {
      // Handle both array and single string cases
      const cookieValues = Array.isArray(headerValue) ? headerValue : [headerValue];
      for (const value of cookieValues) {
        const parsed = cookie.parse(value);
        for (const [name, value] of Object.entries(parsed)) {
          cookies.push({ name, value });
        }
      }
    }
  }
  return cookies;
}
