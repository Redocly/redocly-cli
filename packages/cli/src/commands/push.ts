import { RedoclyClient } from '../redocly';
import { promptUser } from '../utils';
import { blue, green } from 'colorette';
import * as fs from 'fs';
import fetch from 'node-fetch';

export async function handlePush (argv: {
    entrypoint?: string;
    'organization-id': string;
    'api-name': string;
    'api-version': string;
}) {
    const clientToken = await promptUser(
        green(
            `\n  🔑 Copy your access token from ${blue(
                `https://app.redoc.online/profile`,
            )} and paste it below`,
        ),
    );
    const client = new RedoclyClient();
    await client.login(clientToken);
    const { entrypoint } = argv;
    const signedUrl = await getSignedUrl();
    await uploadFileToS3(signedUrl, entrypoint!);

    const { version } = await getDefinitionId(client,
        argv['organization-id'],
        argv['api-name'],
        argv['api-version']
    );
    const { definitionId, id } = version;


    const updatePatch = {
        "sourceType": "FILE",
        "source": JSON.stringify({ files:['spec.yaml'], root: 'spec.yaml', branchName: "test"})
    }

    // @ts-ignore
    await client.updateDefinitionVersion(definitionId, id, updatePatch);
}

function getDefinitionId(client: any, orgId: string, definitionName: string, versionName: string) {
    return client.query(`
    query ($orgId: String!, $definitionName: String!, $versionName: String!) {
      version: definitionVersionByOrganizationDefinitionAndName(organizationId: $orgId, definitionName: $definitionName, versionName: $versionName) {
        id
        definitionId
      }
    }
  `, {
        orgId,
        definitionName,
        versionName
    })
}

function getSignedUrl() {
    // return query(`
    //   Query {
    //     signFileUploadCLI(fileName: "pets.yaml")
    //   }
    // `)
    return 'https://dev-redocly-specs.s3.amazonaws.com/spec.yaml?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA27RK5XRJNVVP7OVO%2F20201104%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20201104T140939Z&X-Amz-Expires=60000&X-Amz-Signature=1264aa8fca6bf295f9a4c4dc709287e71811bd0df2c126484e4dfd95ab3236b5&X-Amz-SignedHeaders=host';
}

function uploadFileToS3(url: string, entrypoint: string) {
    const stats = fs.statSync(entrypoint!);
    const fileSizeInBytes = stats.size;
    let readStream = fs.createReadStream(entrypoint!);
    return fetch(url, {
        method: 'PUT',
        //@ts-ignore
        headers: { "Content-length": fileSizeInBytes },
        body: readStream
    })
}
