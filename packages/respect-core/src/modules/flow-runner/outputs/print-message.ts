import { green, red } from 'colorette';

export const EXPECTED_COLOR = green;
export const RECEIVED_COLOR = red;
export const EXPECTED_LABEL = 'Expected';
export const RECEIVED_LABEL = 'Received';

export function printReceived(received: any): string {
  return RECEIVED_COLOR(JSON.stringify(received, null, 2));
}

export function printExpected(expected: any): string {
  return EXPECTED_COLOR(JSON.stringify(expected, null, 2));
}
