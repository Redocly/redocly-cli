import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';
import { yellow, green, blue } from 'colorette';
import { createHash } from 'crypto';
import {
  bundle,
  Config,
  loadConfig,
  RedoclyClient,
  IGNORE_FILE,
  BundleOutputFormat,
  getTotals,
  slash,
  Region,
  getMergedConfig,
} from '@redocly/openapi-core';
import {
  exitWithError,
  printExecutionTime,
  getFallbackEntryPointsOrExit,
  pluralize,
  dumpBundle,
} from '../utils';
import { promptClientToken } from './login';

const DEFAULT_VERSION = 'latest';

type PushArgs = {
  entrypoint?: string;
  destination?: string;
  branchName?: string;
  upsert?: boolean;
  'run-id'?: string;
  region?: Region;
  'skip-decorator'?: string[];
};

export async function handlePush(argv: PushArgs): Promise<void> {
  const config = await loadConfig();
  const region = argv.region || config.region;
  const client = new RedoclyClient(region);
  const isAuthorized = await client.isAuthorizedWithRedoclyByRegion();
  if (!isAuthorized) {
    const clientToken = await promptClientToken(client.domain);
    await client.login(clientToken);
  }

  const startedAt = performance.now();
  const { destination, branchName, upsert } = argv;

  if (
    destination &&
    !(validateDestination(destination) || validateDestinationWithoutOrganization(destination))
  ) {
    exitWithError(
      `Destination argument value is not valid, please use the right format: ${yellow(
        '<@organization-id/api-name@api-version>',
      )}`,
    );
  }

  const [organizationId, name, version] = getDestinationProps(destination, config.organization);

  if (!organizationId) {
    return exitWithError(
      `No organization provided, please use the right format: ${yellow(
        '<@organization-id/api-name@api-version>',
      )} or specify the 'organization' field in the config file.`,
    );
  }
  const entrypoint =
    argv.entrypoint || (name && version && getApiEntrypoint({ name, version, config }));

  if (name && version && !entrypoint) {
    exitWithError(
      `No entrypoint found that matches ${blue(
        `${name}@${version}`,
      )}. Please make sure you have provided the correct data in the config file.`,
    );
  }

  const apis = entrypoint ? { [`${name}@${version}`]: { root: entrypoint } } : config.apis;

  for (const [apiNameAndVersion, { root: entrypoint }] of Object.entries(apis)) {
    const resolvedConfig = getMergedConfig(config, apiNameAndVersion);
    resolvedConfig.lint.skipDecorators(argv['skip-decorator']);

    const [name, version = DEFAULT_VERSION] = apiNameAndVersion.split('@');
    try {
      let rootFilePath = '';
      const filePaths: string[] = [];
      const filesToUpload = await collectFilesToUpload(entrypoint, resolvedConfig);
      const filesHash = hashFiles(filesToUpload.files);

      process.stdout.write(
        `Uploading ${filesToUpload.files.length} ${pluralize(
          'file',
          filesToUpload.files.length,
        )}:\n`,
      );

      let uploaded = 0;

      for (let file of filesToUpload.files) {
        const { signedUploadUrl, filePath } = await client.registryApi.prepareFileUpload({
          organizationId,
          name,
          version,
          filesHash,
          filename: file.keyOnS3,
          isUpsert: upsert,
        });

        if (file.filePath === filesToUpload.root) {
          rootFilePath = filePath;
        }

        filePaths.push(filePath);

        process.stdout.write(
          `Uploading ${file.contents ? 'bundle for ' : ''}${blue(file.filePath)}...`,
        );

        const uploadResponse = await uploadFileToS3(
          signedUploadUrl,
          file.contents || file.filePath,
        );

        const fileCounter = `(${++uploaded}/${filesToUpload.files.length})`;

        if (!uploadResponse.ok) {
          exitWithError(`✗ ${fileCounter}\nFile upload failed\n`);
        }

        process.stdout.write(green(`✓ ${fileCounter}\n`));
      }

      process.stdout.write('\n');

      await client.registryApi.pushApi({
        organizationId,
        name,
        version,
        rootFilePath,
        filePaths,
        branch: branchName,
        isUpsert: upsert,
      });
    } catch (error) {
      if (error.message === 'ORGANIZATION_NOT_FOUND') {
        exitWithError(`Organization ${blue(organizationId)} not found`);
      }

      if (error.message === 'API_VERSION_NOT_FOUND') {
        exitWithError(`The definition version ${blue(name)}/${blue(
          version,
        )} does not exist in organization ${blue(organizationId)}!\n${yellow(
          'Suggestion:',
        )} please use ${blue('-u')} or ${blue('--upsert')} to create definition.
        `);
      }

      throw error;
    }

    process.stdout.write(
      `Definition: ${blue(entrypoint!)} is successfully pushed to Redocly API Registry \n`,
    );
  }
  printExecutionTime('push', startedAt, entrypoint || `apis in organization ${organizationId}`);
}

function getFilesList(dir: string, files?: any): string[] {
  files = files || [];
  const filesAndDirs = fs.readdirSync(dir);
  for (const name of filesAndDirs) {
    if (fs.statSync(path.join(dir, name)).isDirectory()) {
      files = getFilesList(path.join(dir, name), files);
    } else {
      const currentPath = dir + '/' + name;
      files.push(currentPath);
    }
  }
  return files;
}

async function collectFilesToUpload(entrypoint: string, config: Config) {
  let files: { filePath: string; keyOnS3: string; contents?: Buffer }[] = [];
  const [{ path: entrypointPath }] = await getFallbackEntryPointsOrExit([entrypoint], config);

  process.stdout.write('Bundling definition\n');

  const { bundle: openapiBundle, problems } = await bundle({
    config,
    ref: entrypointPath,
    skipRedoclyRegistryRefs: true,
  });

  const fileTotals = getTotals(problems);

  if (fileTotals.errors === 0) {
    process.stdout.write(
      `Created a bundle for ${blue(entrypoint)} ${
        fileTotals.warnings > 0 ? 'with warnings' : ''
      }\n`,
    );
  } else {
    exitWithError(`Failed to create a bundle for ${blue(entrypoint)}\n`);
  }

  const fileExt = path.extname(entrypointPath).split('.').pop();
  files.push(
    getFileEntry(entrypointPath, dumpBundle(openapiBundle.parsed, fileExt as BundleOutputFormat)),
  );

  if (fs.existsSync('package.json')) {
    files.push(getFileEntry('package.json'));
  }
  if (fs.existsSync(IGNORE_FILE)) {
    files.push(getFileEntry(IGNORE_FILE));
  }
  if (config.configFile) {
    // All config file paths including the root one
    files.push(...[...new Set(config.lint.extendPaths)].map((f) => getFileEntry(f)));
    if (config['features.openapi'].htmlTemplate) {
      const dir = getFolder(config['features.openapi'].htmlTemplate);
      const fileList = getFilesList(dir, []);
      files.push(...fileList.map((f) => getFileEntry(f)));
    }
    let pluginFiles = new Set<string>();
    for (const plugin of config.lint.pluginPaths) {
      if (typeof plugin !== 'string') continue;
      const fileList = getFilesList(getFolder(plugin), []);
      fileList.forEach((f) => pluginFiles.add(f));
    }
    files.push(...filterPluginFilesByExt(Array.from(pluginFiles)).map((f) => getFileEntry(f)));
  }
  return {
    files,
    root: path.resolve(entrypointPath),
  };

  function filterPluginFilesByExt(files: string[]) {
    return files.filter((file: string) => {
      const fileExt = path.extname(file).toLowerCase();
      return fileExt === '.js' || fileExt === '.ts' || fileExt === '.mjs' || fileExt === 'json';
    });
  }

  function getFileEntry(filename: string, contents?: string) {
    return {
      filePath: path.resolve(filename),
      keyOnS3: config.configFile
        ? slash(path.relative(path.dirname(config.configFile), filename))
        : slash(path.basename(filename)),
      contents: (contents && Buffer.from(contents, 'utf-8')) || undefined,
    };
  }
}

function getFolder(filePath: string) {
  return path.resolve(path.dirname(filePath));
}

function hashFiles(filePaths: { filePath: string }[]) {
  let sum = createHash('sha256');
  filePaths.forEach((file) => sum.update(fs.readFileSync(file.filePath)));
  return sum.digest('hex');
}

function validateDestination(destination: string) {
  const regexp = /^@+([a-zA-Z0-9-_.& ]+)\/+([^@\/]+)@([^@\/]+)$/;
  return regexp.test(destination);
}

function validateDestinationWithoutOrganization(destination: string) {
  const regexp = /^()([^@\/]+)@([^@\/]+)$/;
  return regexp.test(destination);
}

export function getDestinationProps(
  destination: string | undefined,
  organization: string | undefined,
) {
  return destination && validateDestination(destination)
    ? destination.substring(1).split(/[@\/]/)
    : destination && validateDestinationWithoutOrganization(destination)
    ? [organization, ...destination.split('@')]
    : [organization];
}

type BarePushArgs = Omit<PushArgs, 'entrypoint' | 'destination' | 'branchName'> & {
  maybeEntrypointOrAliasOrDestination?: string;
  maybeDestination?: string;
  maybeBranchName?: string;
  branch?: string;
};

export const transformPush =
  (callback: typeof handlePush) =>
  ({
    maybeEntrypointOrAliasOrDestination,
    maybeDestination,
    maybeBranchName,
    branch,
    ...rest
  }: BarePushArgs) => {
    if (!!maybeBranchName) {
      process.stderr.write(
        yellow(
          'Deprecation warning: Do not use the third parameter as a branch name. Please use a separate --branch option instead.',
        ),
      );
    }
    const entrypoint = maybeDestination ? maybeEntrypointOrAliasOrDestination : undefined;
    const destination = maybeDestination || maybeEntrypointOrAliasOrDestination;
    return callback({
      ...rest,
      destination,
      entrypoint,
      branchName: branch ?? maybeBranchName,
    });
  };

export function getApiEntrypoint({
  name,
  version,
  config: { apis },
}: {
  name: string;
  version: string;
  config: Config;
}): string {
  const api = apis?.[`${name}@${version}`] || (version === DEFAULT_VERSION && apis?.[name]);
  return api?.root;
}

function uploadFileToS3(url: string, filePathOrBuffer: string | Buffer) {
  const fileSizeInBytes =
    typeof filePathOrBuffer === 'string'
      ? fs.statSync(filePathOrBuffer).size
      : filePathOrBuffer.byteLength;
  let readStream =
    typeof filePathOrBuffer === 'string' ? fs.createReadStream(filePathOrBuffer) : filePathOrBuffer;

  return fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Length': fileSizeInBytes.toString(),
    },
    body: readStream,
  });
}
