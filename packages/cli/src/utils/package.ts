import packageJson from '../../package.json' with { type: 'json' };

export const { version, name, engines } = packageJson;
export const redocVersion = packageJson.dependencies.redoc;
