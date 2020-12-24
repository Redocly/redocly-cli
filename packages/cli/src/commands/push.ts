import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { yellow, green, blue } from 'colorette';
import { createHash } from 'crypto';
import { RedoclyClient } from '@redocly/openapi-core';
import { promptUser, exitWithError } from '../utils';

export async function handlePush (argv: {
  entrypoint?: string;
  destination?: string;
  branchName?: string;
  upsert?: boolean;
  'run-id'?: string;
}) {
  const clientToken = await promptUser(
    green(`\n  🔑 Copy your access token from ${blue(`https://app.redoc.online/profile`)} and paste it below`)
  );
  const client = new RedoclyClient();
  await client.login(clientToken);
  const { entrypoint, destination, branchName, upsert } = argv;

  if (!validateDestination(destination!)) {
    exitWithError(`Destination argument value is not valid, please use the right format: ${yellow('<@organization-id/api-name@api-version>')}`);
  }

  const [ organizationId, apiName, apiVersion ] = getDestinationProps(destination!);
  const { version } = await getDefinitionVersion(organizationId, apiName, apiVersion);

  if (upsert && !version) {
    const { organizationById } = await getOrganizationId(organizationId);
    if (!organizationById) { exitWithError('Organization not found'); }
    const { definitionByOrganizationIdAndName } = await getDefinitionByName(apiName, organizationId);

    let definitionId;
    if (!definitionByOrganizationIdAndName) {
      const { def } = await createDefinition(organizationId, apiName);
      definitionId = def.definition.id;
    } else {
      definitionId = definitionByOrganizationIdAndName.id;
    }
    const updatePatch = await processFiles();
    await createDefinitionVersion(definitionId, apiVersion, "FILE", updatePatch.source, '');
  } else {
    if (!version) {
      exitWithError(`
      Definition is not exist!
      Suggestion: please use ${blue('-u')} or ${blue('--upsert')} to create definition.
      `);
    }
    const { definitionId, id } = version;
    const updatePatch = await processFiles();
    await client.updateDefinitionVersion(definitionId, id, updatePatch);
  }

  function getOrganizationId(organizationId: string) {
    return client.query(`
      query ($organizationId: String!) {
        organizationById(id: $organizationId) {
          id
        }
      }
    `, {
      organizationId
    });
  }

  function getDefinitionByName(name: string, organizationId: string) {
    return client.query(`
      query ($name: String!, $organizationId: String!) {
        definitionByOrganizationIdAndName(name: $name, organizationId: $organizationId) {
          id
        }
      }
    `, {
      name,
      organizationId
    });
  }

  function createDefinition(organizationId: string, name: string) {
    return client.query(`
      mutation CreateDefinition($organizationId: String!, $name: String!) {
        def: createDefinition(input: {organizationId: $organizationId, name: $name }) {
          definition {
            id
            nodeId
            name
          }
        }
      }
    `, {
      organizationId,
      name
    })
  }

  function createDefinitionVersion(definitionId: string, name: string, sourceType: string, source: any, description: string) {
    return client.query(`
      mutation CreateVersion($definitionId: Int!, $name: String!, $sourceType: DvSourceType!, $source: JSON, $description: String!) {
        createDefinitionVersion(input: {definitionId: $definitionId, name: $name, sourceType: $sourceType, source: $source, description: $description}) {
          definitionVersion {
            ...VersionDetails
            __typename
          }
          __typename
        }
      }

      fragment VersionDetails on DefinitionVersion {
        id
        nodeId
        uuid
        definitionId
        name
        description
        sourceType
        source
        registryAccess
        __typename
      }
    `, {
      definitionId,
      name,
      sourceType,
      source,
      description
    });
  }

  function getSignedUrl(organizationId: string, filesHash: string, fileName: string) {
    return client.query(`
      query ($organizationId: String!, $filesHash: String!, $fileName: String!) {
        signFileUploadCLI(organizationId: $organizationId, filesHash: $filesHash, fileName: $fileName) {
          signedFileUrl
          uploadedFilePath
        }
      }
    `, {
      organizationId,
      filesHash,
      fileName
    })
  }

  function getDefinitionVersion(organizationId: string, definitionName: string, versionName: string) {
    return client.query(`
      query ($organizationId: String!, $definitionName: String!, $versionName: String!) {
        version: definitionVersionByOrganizationDefinitionAndName(organizationId: $organizationId, definitionName: $definitionName, versionName: $versionName) {
          id
          definitionId
        }
      }
    `, {
      organizationId,
      definitionName,
      versionName
    });
  }

  async function processFiles() {
    const filesPaths = collectFilePaths(entrypoint!);
    const filesHash = createHashFromFiles(filesPaths);
    const fileName = getFilename(entrypoint!);
    const { signFileUploadCLI } = await getSignedUrl(organizationId, filesHash, fileName);
    const { signedFileUrl, uploadedFilePath } = signFileUploadCLI;
    await uploadFileToS3(signedFileUrl, entrypoint!);
    return {
      sourceType: "FILE",
      source: JSON.stringify({
        files: [uploadedFilePath],
        root: uploadedFilePath,
        branchName
      })
    }
  }
}

function collectFilePaths(entrypoint: string) {
  return [entrypoint];
}

function getFilename(filePath: string) {
  return path.basename(filePath);
}

function createHashFromFiles(filePaths: string[]) {
  let sum = createHash('sha256');
  filePaths.forEach(file => sum.update(fs.readFileSync(file)));
  return sum.digest('hex');
}

function validateDestination(destination: string) {
  const regexp = /^@+[a-zA-Z0-9-_]{3,}\/+[a-zA-Z0-9-_]{3,}@[a-zA-Z0-9-_]{2,}$/g;
  return regexp.test(destination);
}

function getDestinationProps(destination: string) {
  return destination.substring(1).split(/[@\/]/);
}

function uploadFileToS3(url: string, entrypoint: string) {
  const stats = fs.statSync(entrypoint!);
  const fileSizeInBytes = stats.size;
  let readStream = fs.createReadStream(entrypoint!);
  return fetch(url, {
    method: 'PUT',
    // @ts-ignore
    headers: {
      'Content-length': fileSizeInBytes
    },
    body: readStream
  })
}
