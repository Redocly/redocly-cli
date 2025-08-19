/* istanbul ignore file */
export function delay(seconds = 0) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
