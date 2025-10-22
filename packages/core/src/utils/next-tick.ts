export function nextTick() {
  return new Promise((resolve) => {
    setTimeout(resolve);
  });
}
