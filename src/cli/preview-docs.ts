import * as colorette from 'colorette';
import * as chockidar from 'chokidar';

import { loadConfig } from '../config/config';
import { bundle } from '../bundle';
import { getFallbackEntryPointsOrExit, getTotals } from '../cli';
import startPreviewServer from './preview-server/preview-server';

export async function previewDocs(argv: {
  port: number,
  useCommunityEdition?: boolean;
  config?: string;
  entrypoint: string;
  'skip-rule'?: string[];
  'skip-decorator'?: string[];
  'skip-preprocessor'?: string[];
  force?: boolean;
}) {
  let isAuthorizedWithRedocly: boolean = false;
  let redocOptions: any = {};
  let config = await reloadConfig();

  const entrypoint = getFallbackEntryPointsOrExit([argv.entrypoint], config)[0];

  let cachedBundle: any;
  const deps = new Set<string>();

  async function getBundle() {
    return cachedBundle;
  }

  async function updateBundle() {
    process.stdout.write('\nBundling...\n\n');
    const { bundle: openapiBundle, messages, fileDependencies } = await bundle({
      ref: entrypoint,
      config,
    });

    const removed = [...deps].filter((x) => !fileDependencies.has(x));
    watcher.unwatch(removed);
    watcher.add([...fileDependencies]);
    deps.clear();
    fileDependencies.forEach(deps.add, deps);

    const fileTotals = getTotals(messages);

    if (fileTotals.errors === 0) {
      process.stdout.write(
        fileTotals.errors === 0
          ? `Created a bundle for ${entrypoint} ${
            fileTotals.warnings > 0 ? 'with warnings' : 'successfully'
            }\n`
          : colorette.yellow(
              `Created a bundle for ${entrypoint} with errors. Docs may be broken or not accurate\n`,
            ),
      );
    }

    return openapiBundle;
  }

  setImmediate(() => {
    cachedBundle = updateBundle();
  }); // initial cache

  const hotClients = await startPreviewServer(argv.port, {
    getBundle,
    getOptions: () => redocOptions,
    useRedocPro:
      (isAuthorizedWithRedocly || redocOptions.licenseKey) && !redocOptions.useCommunityEdition,
  });

  const watcher = chockidar.watch([entrypoint, config.configFile!], {
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
      `\n  👀  Watching ${colorette.blue(entrypoint)} and all related resources for changes\n\n`,
    );
  });

  async function reloadConfig() {
    let config = await loadConfig(argv.config);
    config.lint.skipRules(argv['skip-rule']);
    config.lint.skipPreprocessors(argv['skip-preprocessor']);
    config.lint.skipDecorators(argv['skip-decorator']);

    // FIXME: Redocly Registry Support
    // const redoclyClient = new RedoclyClient();
    // const isAuthorizedWithRedocly = await redoclyClient.isAuthorizedWithRedocly();
    isAuthorizedWithRedocly = false;
    const referenceDocs = config.referenceDocs || {};

    redocOptions = {
      ...referenceDocs,
      useCommunityEdition: argv.useCommunityEdition || referenceDocs.useCommunityEdition,
      licenseKey: process.env.REDOCLY_LICENSE_KEY || referenceDocs.licenseKey,
    };

    return config;
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