// Function from @redocly/cli
export function getExecutionTime(startedAt: number) {
  return process.env.NODE_ENV === 'test'
    ? '<test>ms'
    : `${Math.ceil(performance.now() - startedAt)}ms`;
}
