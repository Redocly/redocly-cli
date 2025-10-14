export function omit<O extends object, K extends keyof O>(obj: O, keys: K[]): Omit<O, K> {
  const result = { ...obj };

  keys.forEach((key) => {
    delete result[key];
  });

  return result;
}
