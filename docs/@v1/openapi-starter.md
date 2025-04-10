# How to use openapi-starter

The [openapi-starter](https://github.com/Redocly/openapi-starter) is a Redocly project that you can clone to your own GitHub account to more easily manage API description files either as single files or multiple files.

It automatically creates the required folder structure and generates a basic OpenAPI description file, which is great if you're new to API reference docs.

Although you can create your own folder structure, we recommend letting `openapi-starter` set it up initially (you can always make changes later). The folder structure is also key when using the OpenAPI `split` and `bundle` commands, which are used to split up large API descriptions for easier maintenance, and compile the constituent files back into a single file when you're ready to publish your API reference docs.

## Step 1: Copy the openapi-starter project

1. Go to [https://github.com/Redocly/openapi-starter](https://github.com/Redocly/openapi-starter).
2. Select **Use this template**.
3. You’ll be asked to create a new repository from openapi-starter.
4. Give your repo a meaningful name (e.g. redocly-openapi-starter).
5. Choose whether you want it to be public or private.
6. Leave the **Include all branches** option deselected.
7. Select **Create repository from template**.

The project is copied to your GitHub account. It is independent and not linked to the source.

## Step 2: Clone the project

Clone the project to your local machine so you can use it with [Redocly CLI](quickstart.md).

## Step 3: Work with OpenAPI

By default, there is a root directory (`openapi`) that contains a sample API description file (`openapi.yaml`). The sample file is already split into its constituent parts, which are contained in the `code_samples`, `components` and `paths` folders.

### Just starting out with API docs?

Use our `openapi.yaml` file to explore Redocly CLI. We suggest you [run some basic commands](quickstart.md) like `lint`, `bundle` and `split` to practice.

### Got your own API description file?

You can add your files straight into the `openapi` folder and use the existing sub-folders when splitting them up for easier maintenance (`split` command) and compiling them back into a single file (`bundle`) for publishing out. Be aware that the more API descriptions stored in the `openapi` folder, the more cluttered the sub-folders. But hey, if you like clutter then go for it!

Prefer things more orderly? Create new root folders to store each API description. When you run the `split` command in Redocly CLI for a specified description file, the sub-folders are automatically created under the root and populated with the constituent parts of your main API description file.
