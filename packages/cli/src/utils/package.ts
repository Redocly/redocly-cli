import packageJson from '../../package.json' with { type: 'json' };

export const { version, name, engines } = packageJson;
export const redocVersion = packageJson.devDependencies.redoc;

/**
 * Subresource Integrity hash for the redoc.standalone.js bundle loaded from the CDN.
 * Must match `redocVersion`. When bumping redoc, recompute with:
 *   openssl dgst -sha384 -binary node_modules/redoc/bundles/redoc.standalone.js | openssl base64 -A
 * The smoke-test snapshot (tests/smoke/basic/pre-built/redoc.html) flags the resulting output change.
 */
export const redocStandaloneSri =
  'sha384-w447zOpYfw/1Tv/5AK9NfHTlQIqE3RVR6KY62jCyy9zNDgO64cMwGGP1Fj0zJVf5';
