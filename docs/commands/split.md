# `split`

The `split` command takes an API definition file and creates a multi-file structure out of it by extracting referenced parts into standalone, separate files. Essentially, the `split` command does the opposite of the `bundle` command.


<div class="warning">
The `split` command doesn't support OpenAPI 2.0 definitions.
</div>


### `split` usage


```shell
Positionals:
entrypoint                                                            [string]

Options:
--version  Show version number.                                      [boolean]
--help     Show help.                                                [boolean]
--outDir   Output directory where files will be saved      [string] [required]
```


The command:


```bash
openapi split openapi/petstore.yaml --outDir test
```


If the specified output directory doesn't exist, it's automatically created. In that directory, the `split` command "unbundles" the specified API definition. Code samples, components, and paths are split from the root definition into separate files and folders. The structure of the unbundled directory corresponds to the structure created by our [Create OpenAPI repo](https://github.com/Redocly/create-openapi-repo) tool.
