import * as querystring from 'querystring';

export function buildParams(paramString: string): any[] {
  const params = [];
  const parsed = querystring.parse(paramString);
  for (const name in parsed) {
    const value = parsed[name];
    if (Array.isArray(value)) {
      value.forEach((item) => {
        params.push({ name, value: item });
      });
    } else {
      params.push({ name, value });
    }
  }
  return params;
}
