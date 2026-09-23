import { logger } from '@redocly/openapi-core';
import type { DeviceCode } from '@redocly/reunite-integration';
import { blue } from 'colorette';

export function printDeviceCode({ verificationUri, userCode }: DeviceCode): void {
  logger.output(
    'Attempting to automatically open the SSO authorization page in your default browser.\n'
  );
  logger.output(
    'If the browser does not open or you wish to use a different device to authorize this request, open the following URL:\n\n'
  );
  logger.output(blue(verificationUri));
  logger.output(`\n\n`);
  logger.output(`Then enter the code:\n\n`);
  logger.output(blue(userCode));
  logger.output(`\n\n`);
}
