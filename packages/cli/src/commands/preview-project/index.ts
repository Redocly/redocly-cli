import { logger } from '@redocly/openapi-core';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { getPlatformSpawnArgs } from '../../utils/platform.js';
import type { CommandArgs } from '../../wrapper.js';
import { PRODUCT_NAMES, PRODUCT_PACKAGES } from './constants.js';
import type { PreviewProjectArgv, Product } from './types.js';

export const previewProject = async ({ argv }: CommandArgs<PreviewProjectArgv>) => {
  const { plan, port } = argv;
  const projectDir = resolveProjectDir(argv['project-dir']);

  if (argv.product) {
    logger.warn(
      `The --product option is deprecated. It still picks the product package; without it, the preview uses the package listed in package.json, or ${PRODUCT_PACKAGES.framework} by default.\n`
    );
  }

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
    [
      '-y',
      packageName,
      'preview',
      `--plan=${plan}`,
      `--port=${port || 4000}`,
      // The Windows spawn goes through a shell, where a path with spaces needs quotes.
      `--project-dir=${shell ? `"${projectDir}"` : projectDir}`,
    ],
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

/**
 * The absolute project directory. `npm run` and `pnpm run` start the command in the package
 * root and leave the invocation directory in `INIT_CWD`. It is used only when it sits inside
 * the current directory: a launcher moved the command up. Otherwise (`npm run -w`,
 * `pnpm --filter`, a script that runs `cd`) the current directory is the project.
 */
export const resolveProjectDir = (projectDir: string, env = process.env): string => {
  const cwd = process.cwd();
  const initCwd = path.resolve(env.INIT_CWD || cwd);
  const base = initCwd.startsWith(cwd + path.sep) ? initCwd : cwd;
  return path.resolve(base, projectDir);
};

const isValidProduct = (product: string | undefined): product is Product => {
  if (!product) {
    return false;
  }

  return !!PRODUCT_NAMES[product as Product];
};

/** The product package listed in the project's package.json, or the framework when none is. */
const tryGetProductFromPackageJson = (projectDir: string): Product => {
  const packageJsonPath = path.join(projectDir, 'package.json');

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
      logger.info(
        `Invalid 'package.json': ${packageJsonPath}. Using ${PRODUCT_PACKAGES.framework}.`
      );
    }
  }

  return 'framework';
};
