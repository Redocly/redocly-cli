import path = require('path');
import { existsSync, readFileSync } from 'fs';
import { spawn } from 'child_process';
import { PRODUCT_NAMES, PRODUCT_PACKAGES } from './constants';

import type { PreviewProjectOptions, Product } from './types';

export const previewProject = async (args: PreviewProjectOptions) => {
  const { plan, port } = args;
  const projectDir = args['source-dir'];

  const product = args.product || tryGetProductFromPackageJson(projectDir);

  if (!isValidProduct(product)) {
    process.stderr.write(`Invalid product ${product}`);
    throw new Error(`Project preview launch failed`);
  }

  const productName = PRODUCT_NAMES[product];
  const packageName = PRODUCT_PACKAGES[product];

  process.stdout.write(`\nLaunching preview of ${productName} ${plan} using NPX\n\n`);

  const npxExecutableName = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  spawn(
    npxExecutableName,
    ['-y', packageName, 'develop', `--plan=${plan}`, `--port=${port || 4000}`],
    {
      stdio: 'inherit',
      cwd: projectDir,
    }
  );
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
          process.stdout.write(`\n${packageName} detected in project's 'package.json'`);
          return product as Product;
        }
      }
    } catch (error) {
      process.stdout.write(`Invalid 'package.json': ${packageJsonPath}. Using Realm.`);
    }
  }

  return 'realm';
};
