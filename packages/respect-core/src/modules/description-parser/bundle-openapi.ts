import { bundle, type BaseResolver, type Config } from '@redocly/openapi-core';

type BundleOpenApiOptions = {
  descriptionPath: string;
  base?: string;
  externalRefResolver?: BaseResolver;
  config: Config;
};

export async function bundleOpenApi(options: BundleOpenApiOptions): Promise<any> {
  const { descriptionPath, externalRefResolver, base } = options;
  const bundled = await bundle({
    base,
    ref: descriptionPath,
    config: options.config,
    dereference: true,
    externalRefResolver,
  });

  if (!bundled) {
    throw new Error(`Could not find source description file '${descriptionPath}'.`);
  }

  return bundled.bundle.parsed;
}
