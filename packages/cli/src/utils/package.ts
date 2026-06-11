// esbuild inlines this; the attribute is required by nodenext resolution.
import packageJson from '../../package.json' with { type: 'json' };

export const { version, name, engines } = packageJson;
export const redocVersion = packageJson.dependencies.redoc;
