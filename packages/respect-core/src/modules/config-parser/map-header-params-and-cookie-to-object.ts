export function mapHeaderParamsAndCookieToObject(headerParams: { [key: string]: string }): {
  [key: string]: string;
} {
  const headerParamsWithMappedCookies: { [key: string]: string } = {};

  for (const [key, value] of Object.entries(headerParams)) {
    if (key.toLowerCase() === 'cookie') {
      const cookies = value.split(';');
      for (const cookie of cookies) {
        const [cookieKey, cookieValue] = cookie.split('=');
        if (cookieKey && cookieValue) {
          headerParamsWithMappedCookies[cookieKey.trim()] = cookieValue.trim();
        }
      }
    } else {
      headerParamsWithMappedCookies[key] = value;
    }
  }

  return headerParamsWithMappedCookies;
}
