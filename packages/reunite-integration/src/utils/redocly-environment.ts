// A name or product tokens such as `reunite` or `redocly-reunite-push-action/v1.4.0`, separated by single spaces.
const REDOCLY_ENVIRONMENT_PATTERN = /^[\x21-\x7e]+( [\x21-\x7e]+)*$/;

export function getRedoclyEnvironment(): string | undefined {
  const value = process.env.REDOCLY_ENVIRONMENT?.trim();

  return value && REDOCLY_ENVIRONMENT_PATTERN.test(value) ? value : undefined;
}
