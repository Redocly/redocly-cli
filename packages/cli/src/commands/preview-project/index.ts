import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { logger } from '@redocly/openapi-core';
import { PRODUCT_NAMES, PRODUCT_PACKAGES } from './constants.js';
import { getPlatformSpawnArgs } from '../../utils/platform.js';

import type { PreviewProjectArgv, Product } from './types.js';
import type { CommandArgs } from '../../wrapper.js';

export const previewProject = async ({ argv }: CommandArgs<PreviewProjectArgv>) => {
  const { plan, port } = argv;
  const projectDir = argv['project-dir'];

  const product = argv.product || tryGetProductFromPackageJson(projectDir);

  if (!isValidProduct(product)) {
    logger.info(`Invalid product ${product}.`);
    throw new Error(`Project preview launch failed.`);
  }

  const productName = PRODUCT_NAMES[product];
  const packageName = PRODUCT_PACKAGES[product];

  logger.info(`\nLaunching preview of ${productName} ${plan} using NPX.\n\n`);
  const { npxExecutableName, shell } = getPlatformSpawnArgs();

  const child = spawn(
    npxExecutableName,
    ['-y', packageName, 'preview', `--plan=${plan}`, `--port=${port || 4000}`],
    {
      stdio: 'inherit',
      cwd: projectDir,
      shell,
    }
  );

  child.on('error', (error) => {
    logger.info(`Project preview launch failed: ${error.message}`);
    throw new Error(`Project preview launch failed.`);
  });
};

const isValidProduct = (product: string | undefined): product is Product => {
  if (!product) {
    return false;
  }

  return !!PRODUCT_NAMES[product as Product];
};

const tryGetProductFromPackageJson = (projectDir: string): Product => {
  const packageJsonPath = path.join(process.cwd(), projectDir, 'package.json');

  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const packageJsonDeps = packageJson.dependencies || {};

      for (const [product, packageName] of Object.entries(PRODUCT_PACKAGES)) {
        if (packageJsonDeps[packageName]) {
          logger.info(`\n${packageName} detected in project's 'package.json'`);
          return product as Product;
        }
      }
    } catch (error) {
      logger.info(`Invalid 'package.json': ${packageJsonPath}. Using Realm.`);
    }
  }

  return 'realm';
};
