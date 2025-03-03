import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { loadConfig, bundle, bundleFromString } from '@redocly/openapi-core';
import { type BundleResult } from '@redocly/openapi-core/lib/bundle';
import { isURL } from '../../utils/is-url';

export async function bundleOpenApi(path: string = '', workflowPath: string): Promise<any> {
  const isUrl = isURL(path);
  const config = await loadConfig();
  let bundleDocument: BundleResult;

  if (isUrl) {
    // Download OpenAPI YAML file
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI YAML file. Status: ${response.status}`);
    }

    const openApiYaml = await response.text();
    bundleDocument = await bundleFromString({
      source: openApiYaml,
      config,
      dereference: true,
    });
  } else {
    const descriptionPath = path && resolve(dirname(workflowPath), path);

    if (!existsSync(descriptionPath)) {
      throw new Error(`Could not find source description file '${path}' at path '${workflowPath}'`);
    }

    bundleDocument = await bundle({
      ref: descriptionPath,
      config,
      dereference: true,
    });
  }

  if (!bundleDocument) return;

  const {
    bundle: {
      parsed: { paths, servers, info, security, components },
    },
  } = bundleDocument;

  return { paths, servers, info, security, components };
}
