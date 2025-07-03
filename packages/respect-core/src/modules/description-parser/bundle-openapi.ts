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

  if (!bundled) return;

  return bundled.bundle.parsed;
}
