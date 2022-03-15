import * as colorette from 'colorette';
import * as chockidar from 'chokidar';
import {
  bundle,
  loadConfig,
  ResolveError,
  YamlParseError,
  RedoclyClient,
  getTotals,
  getMergedConfig,
} from '@redocly/openapi-core';
import { getFallbackEntryPointsOrExit } from '../../utils';
import startPreviewServer from './preview-server/preview-server';

export async function previewDocs(argv: {
  port: number;
  host: string;
  'use-community-edition'?: boolean;
  config?: string;
  entrypoint?: string;
  'skip-rule'?: string[];
  'skip-decorator'?: string[];
  'skip-preprocessor'?: string[];
  force?: boolean;
}) {
  let isAuthorizedWithRedocly: boolean = false;
  let redocOptions: any = {};
  let config = await reloadConfig();

  const entrypoints = await getFallbackEntryPointsOrExit(
    argv.entrypoint ? [argv.entrypoint] : [],
    config,
  );
  const entrypoint = entrypoints[0];

  let cachedBundle: any;
  const deps = new Set<string>();

  async function getBundle() {
    return cachedBundle;
  }

  async function updateBundle() {
    process.stdout.write('\nBundling...\n\n');
    try {
      const {
        bundle: openapiBundle,
        problems,
        fileDependencies,
      } = await bundle({
        ref: entrypoint.path,
        config,
      });
      const removed = [...deps].filter((x) => !fileDependencies.has(x));
      watcher.unwatch(removed);
      watcher.add([...fileDependencies]);
      deps.clear();
      fileDependencies.forEach(deps.add, deps);

      const fileTotals = getTotals(problems);

      if (fileTotals.errors === 0) {
        process.stdout.write(
          fileTotals.errors === 0
            ? `Created a bundle for ${entrypoint.alias || entrypoint.path} ${
                fileTotals.warnings > 0 ? 'with warnings' : 'successfully'
              }\n`
            : colorette.yellow(
                `Created a bundle for ${
                  entrypoint.alias || entrypoint.path
                } with errors. Docs may be broken or not accurate\n`,
              ),
        );
      }

      return openapiBundle.parsed;
    } catch (e) {
      handleError(e, entrypoint.path);
    }
  }

  setImmediate(() => {
    cachedBundle = updateBundle();
  }); // initial cache

  const isAuthorized = isAuthorizedWithRedocly || redocOptions.licenseKey;
  if (!isAuthorized) {
    process.stderr.write(
      `Using Redoc community edition.\nLogin with openapi-cli ${colorette.blue(
        'login',
      )} or use an enterprise license key to preview with the premium docs.\n\n`,
    );
  }

  const hotClients = await startPreviewServer(argv.port, argv.host, {
    getBundle,
    getOptions: () => redocOptions,
    useRedocPro: isAuthorized && !redocOptions.useCommunityEdition,
  });

  const watchPaths = [entrypoint.path, config.configFile!].filter((e) => !!e);
  const watcher = chockidar.watch(watchPaths, {
    disableGlobbing: true,
    ignoreInitial: true,
  });

  const debouncedUpdatedBundle = debounce(async () => {
    cachedBundle = updateBundle();
    await cachedBundle;
    hotClients.broadcast('{"type": "reload", "bundle": true}');
  }, 2000);

  const changeHandler = async (type: string, file: string) => {
    process.stdout.write(`${colorette.green('watch')} ${type} ${colorette.blue(file)}\n`);
    if (file === config.configFile) {
      config = await reloadConfig();
      hotClients.broadcast(JSON.stringify({ type: 'reload' }));
      return;
    }

    debouncedUpdatedBundle();
  };

  watcher.on('change', changeHandler.bind(undefined, 'changed'));
  watcher.on('add', changeHandler.bind(undefined, 'added'));
  watcher.on('unlink', changeHandler.bind(undefined, 'removed'));

  watcher.on('ready', () => {
    process.stdout.write(
      `\n  👀  Watching ${colorette.blue(
        entrypoint.path,
      )} and all related resources for changes\n\n`,
    );
  });

  async function reloadConfig() {
    let config = await loadConfig(argv.config);
    const redoclyClient = new RedoclyClient();
    isAuthorizedWithRedocly = await redoclyClient.isAuthorizedWithRedocly();
    const resolvedConfig = getMergedConfig(config, argv.entrypoint);
    resolvedConfig.lint.skipRules(argv['skip-rule']);
    resolvedConfig.lint.skipPreprocessors(argv['skip-preprocessor']);
    resolvedConfig.lint.skipDecorators(argv['skip-decorator']);
    const referenceDocs = resolvedConfig['features.openapi'];
    redocOptions = {
      ...referenceDocs,
      useCommunityEdition: argv['use-community-edition'] || referenceDocs.useCommunityEdition,
      licenseKey: process.env.REDOCLY_LICENSE_KEY || referenceDocs.licenseKey,
    };
    return resolvedConfig;
  }
}

export function debounce(func: Function, wait: number, immediate?: boolean) {
  let timeout: NodeJS.Timeout | null;

  return function executedFunction(...args: any[]) {
    // @ts-ignore
    const context = this;

    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(later, wait);

    if (callNow) func.apply(context, args);
  };
}

function handleError(e: Error, ref: string) {
  if (e instanceof ResolveError) {
    process.stderr.write(
      `Failed to resolve entrypoint definition at ${ref}:\n\n  - ${e.message}.\n\n`,
    );
  } else if (e instanceof YamlParseError) {
    process.stderr.write(
      `Failed to parse entrypoint definition at ${ref}:\n\n  - ${e.message}.\n\n`,
    );
  } else {
    process.stderr.write(`Something went wrong when processing ${ref}:\n\n  - ${e.message}.\n\n`);
  }
}
