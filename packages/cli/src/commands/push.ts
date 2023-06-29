import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';
import { yellow, green, blue, red } from 'colorette';
import { createHash } from 'crypto';
import {
  bundle,
  Config,
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
  getFallbackApisOrExit,
  pluralize,
  dumpBundle,
} from '../utils';
import { promptClientToken } from './login';

const DEFAULT_VERSION = 'latest';

export const DESTINATION_REGEX =
  /^(@(?<organizationId>[\w\-\s]+)\/)?(?<name>[^@]*)@(?<version>[\w\.\-]+)$/;

export type PushOptions = {
  api?: string;
  destination?: string;
  branchName?: string;
  upsert?: boolean;
  'job-id'?: string;
  'batch-size'?: number;
  region?: Region;
  'skip-decorator'?: string[];
  public?: boolean;
  files?: string[];
  organization?: string;
  config?: string;
};

export async function handlePush(argv: PushOptions, config: Config): Promise<void> {
  const client = new RedoclyClient(config.region);
  const isAuthorized = await client.isAuthorizedWithRedoclyByRegion();
  if (!isAuthorized) {
    const clientToken = await promptClientToken(client.domain);
    await client.login(clientToken);
  }

  const startedAt = performance.now();
  const { destination, branchName, upsert } = argv;

  const jobId = argv['job-id'];
  const batchSize = argv['batch-size'];

  if (destination && !DESTINATION_REGEX.test(destination)) {
    exitWithError(
      `Destination argument value is not valid, please use the right format: ${yellow(
        '<api-name@api-version>'
      )}`
    );
  }

  const destinationProps = getDestinationProps(destination, config.organization);

  const organizationId = argv.organization || destinationProps.organizationId;
  const { name, version } = destinationProps;

  if (!organizationId) {
    return exitWithError(
      `No organization provided, please use --organization option or specify the 'organization' field in the config file.`
    );
  }

  const api = argv.api || (name && version && getApiRoot({ name, version, config }));

  if (name && version && !api) {
    exitWithError(
      `No api found that matches ${blue(
        `${name}@${version}`
      )}. Please make sure you have provided the correct data in the config file.`
    );
  }

  // Ensure that a destination for the api is provided.
  if (!name && api) {
    return exitWithError(
      `No destination provided, please use --destination option to provide destination.`
    );
  }

  if (jobId && !jobId.trim()) {
    exitWithError(
      `The ${blue(`job-id`)} option value is not valid, please avoid using an empty string.`
    );
  }

  if (batchSize && batchSize < 2) {
    exitWithError(
      `The ${blue(`batch-size`)} option value is not valid, please use the integer bigger than 1.`
    );
  }

  const apis = api ? { [`${name}@${version}`]: { root: api } } : config.apis;
  if (!Object.keys(apis).length) {
    exitWithError(
      `Api not found. Please make sure you have provided the correct data in the config file.`
    );
  }

  for (const [apiNameAndVersion, { root: api }] of Object.entries(apis)) {
    const resolvedConfig = getMergedConfig(config, apiNameAndVersion);
    resolvedConfig.styleguide.skipDecorators(argv['skip-decorator']);

    const [name, version = DEFAULT_VERSION] = apiNameAndVersion.split('@');
    const encodedName = encodeURIComponent(name);
    try {
      let rootFilePath = '';
      const filePaths: string[] = [];
      const filesToUpload = await collectFilesToUpload(api, resolvedConfig);
      const filesHash = hashFiles(filesToUpload.files);

      process.stdout.write(
        `Uploading ${filesToUpload.files.length} ${pluralize(
          'file',
          filesToUpload.files.length
        )}:\n`
      );

      let uploaded = 0;

      for (const file of filesToUpload.files) {
        const { signedUploadUrl, filePath } = await client.registryApi.prepareFileUpload({
          organizationId,
          name: encodedName,
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
          `Uploading ${file.contents ? 'bundle for ' : ''}${blue(file.filePath)}...`
        );

        const uploadResponse = await uploadFileToS3(
          signedUploadUrl,
          file.contents || file.filePath
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
        name: encodedName,
        version,
        rootFilePath,
        filePaths,
        branch: branchName,
        isUpsert: upsert,
        isPublic: argv['public'],
        batchId: jobId,
        batchSize: batchSize,
      });
    } catch (error) {
      if (error.message === 'ORGANIZATION_NOT_FOUND') {
        exitWithError(`Organization ${blue(organizationId)} not found`);
      }

      if (error.message === 'API_VERSION_NOT_FOUND') {
        exitWithError(
          `The definition version ${blue(
            `${name}@${version}`
          )} does not exist in organization ${blue(organizationId)}!\n${yellow(
            'Suggestion:'
          )} please use ${blue('-u')} or ${blue('--upsert')} to create definition.\n\n`
        );
      }

      throw error;
    }

    process.stdout.write(
      `Definition: ${blue(api!)} is successfully pushed to Redocly API Registry \n`
    );
  }
  printExecutionTime('push', startedAt, api || `apis in organization ${organizationId}`);
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

async function collectFilesToUpload(api: string, config: Config) {
  const files: { filePath: string; keyOnS3: string; contents?: Buffer }[] = [];
  const [{ path: apiPath }] = await getFallbackApisOrExit([api], config);

  process.stdout.write('Bundling definition\n');

  const { bundle: openapiBundle, problems } = await bundle({
    config,
    ref: apiPath,
    skipRedoclyRegistryRefs: true,
  });

  const fileTotals = getTotals(problems);

  if (fileTotals.errors === 0) {
    process.stdout.write(
      `Created a bundle for ${blue(api)} ${fileTotals.warnings > 0 ? 'with warnings' : ''}\n`
    );
  } else {
    exitWithError(`Failed to create a bundle for ${blue(api)}\n`);
  }

  const fileExt = path.extname(apiPath).split('.').pop();
  files.push(
    getFileEntry(apiPath, dumpBundle(openapiBundle.parsed, fileExt as BundleOutputFormat))
  );

  if (fs.existsSync('package.json')) {
    files.push(getFileEntry('package.json'));
  }
  if (fs.existsSync(IGNORE_FILE)) {
    files.push(getFileEntry(IGNORE_FILE));
  }
  if (config.configFile) {
    // All config file paths including the root one
    files.push(...[...new Set(config.styleguide.extendPaths)].map((f) => getFileEntry(f)));
    if (config.theme?.openapi?.htmlTemplate) {
      const dir = getFolder(config.theme.openapi.htmlTemplate);
      const fileList = getFilesList(dir, []);
      files.push(...fileList.map((f) => getFileEntry(f)));
    }
    const pluginFiles = new Set<string>();
    for (const plugin of config.styleguide.pluginPaths) {
      if (typeof plugin !== 'string') continue;
      const fileList = getFilesList(getFolder(plugin), []);
      fileList.forEach((f) => pluginFiles.add(f));
    }
    files.push(...filterPluginFilesByExt(Array.from(pluginFiles)).map((f) => getFileEntry(f)));
  }

  if (config.files) {
    const otherFiles = new Set<string>();
    for (const file of config.files) {
      if (fs.statSync(file).isDirectory()) {
        const fileList = getFilesList(file, []);
        fileList.forEach((f) => otherFiles.add(f));
      } else {
        otherFiles.add(file);
      }
    }
    files.push(...Array.from(otherFiles).map((f) => getFileEntry(f)));
  }

  return {
    files,
    root: path.resolve(apiPath),
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
  const sum = createHash('sha256');
  filePaths.forEach((file) => sum.update(fs.readFileSync(file.filePath)));
  return sum.digest('hex');
}

function parseDestination(
  destination?: string
): { organizationId?: string; name?: string; version?: string } | undefined {
  return destination?.match(DESTINATION_REGEX)?.groups;
}

export function getDestinationProps(
  destination: string | undefined,
  organization: string | undefined
) {
  const groups = destination && parseDestination(destination);
  if (groups) {
    return {
      organizationId: groups.organizationId || organization,
      name: groups.name,
      version: groups.version,
    };
  } else {
    return { organizationId: organization, name: undefined, version: undefined };
  }
}

type BarePushArgs = Omit<PushOptions, 'destination' | 'branchName'> & {
  maybeDestination?: string;
  maybeBranchName?: string;
  branch?: string;
  destination?: string;
};

export const transformPush =
  (callback: typeof handlePush) =>
  (
    {
      api: maybeApiOrDestination,
      maybeDestination,
      maybeBranchName,
      branch,
      'batch-id': batchId,
      'job-id': jobId,
      ...rest
    }: BarePushArgs & { 'batch-id'?: string },
    config: Config
  ) => {
    if (batchId) {
      process.stderr.write(
        yellow(
          `The ${red('batch-id')} option is deprecated. Please use ${green('job-id')} instead.\n\n`
        )
      );
    }

    if (maybeBranchName) {
      process.stderr.write(
        yellow(
          'Deprecation warning: Do not use the third parameter as a branch name. Please use a separate --branch option instead.\n\n'
        )
      );
    }

    let apiFile, destination;
    if (maybeDestination) {
      process.stderr.write(
        yellow(
          'Deprecation warning: Do not use the second parameter as a destination. Please use a separate --destination and --organization instead.\n\n'
        )
      );
      apiFile = maybeApiOrDestination;
      destination = maybeDestination;
    } else if (maybeApiOrDestination && DESTINATION_REGEX.test(maybeApiOrDestination)) {
      process.stderr.write(
        yellow(
          'Deprecation warning: Do not use the first parameter as a destination. Please use a separate --destination and --organization options instead.\n\n'
        )
      );
      destination = maybeApiOrDestination;
    } else if (maybeApiOrDestination && !DESTINATION_REGEX.test(maybeApiOrDestination)) {
      apiFile = maybeApiOrDestination;
    }

    destination = rest.destination || destination;

    return callback(
      {
        ...rest,
        destination,
        api: apiFile,
        branchName: branch ?? maybeBranchName,
        'job-id': jobId || batchId,
      },
      config
    );
  };

export function getApiRoot({
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
  const readStream =
    typeof filePathOrBuffer === 'string' ? fs.createReadStream(filePathOrBuffer) : filePathOrBuffer;

  return fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Length': fileSizeInBytes.toString(),
    },
    body: readStream,
  });
}
