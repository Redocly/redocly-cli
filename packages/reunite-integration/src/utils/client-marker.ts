// A name or product tokens such as `reunite` or `redocly-reunite-push-action/v1.4.0`, separated by single spaces.
const CLIENT_MARKER_PATTERN = /^[\x21-\x7e]+( [\x21-\x7e]+)*$/;

export function getClientMarker(): string | undefined {
  const marker = process.env.REDOCLY_ENVIRONMENT?.trim();

  return marker && CLIENT_MARKER_PATTERN.test(marker) ? marker : undefined;
}
