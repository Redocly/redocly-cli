const throws = (fn: () => unknown) => {
  try {
    fn();
  } catch {
    return true;
  }

  return false;
};

export function isURL(url: string) {
  return !throws(() => new URL(url));
}
