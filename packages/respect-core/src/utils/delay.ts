/* istanbul ignore file */
export function delay(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
