# How to implement openapi-starter

## About the openapi-starter project

The [openapi-starter](https://github.com/Redocly/openapi-starter) is a Redocly project that you can clone to your own GitHub account to more easily manage API definition files either as single files or multiple files.

It automatically creates the required folder structure and generates a basic OpenAPI definition file, which is great if you're new to API reference docs.

Although you can create your own folder structure, we recommend letting `openapi-starter` set it up initially (you can always make changes later). The folder structure is also key when using the `split` and `bundle` commands, which are used to split up large definitions for easier maintenance, and compile the consituent files back into a single file when you're ready to publish your API reference docs.

## How to implement openapi-starter

### Step 1: Copy the openapi-starter project

1. Go to [https://github.com/Redocly/openapi-starter](https://github.com/Redocly/openapi-starter).
2. Click the **Use this template** button.
3. You’ll be asked to create a new repository from openapi-starter.
4. Give your repo a meaningful name (e.g. redocly-openapi-starter).
5. Choose whether you want it to be public or private.
6. Leave the **Include all branches** option deselected.
7. Click the **Create repository from template** button.

The project is copied to your GitHub account. It is independent and not linked to the source.

### Step 2: Clone the project

This step clones the project to your local machine so you can use it with [OpenAPI CLI](.docs/quickstart.md).

:::info
We use [GitHub Desktop](https://desktop.github.com/) in this example, but go ahead and use whatever cloning method you like.
:::

1. In your copied openapi-starter repo, click the **Copy** button.
2. Select **Open with GitHub Desktop**.
3. Select a local path where you want to store the repo folders and files.
4. Click the **Clone** button to clone your copied repo to your local machine.
5. In GitHub Desktop, select your tool of choice to explore the folders and files (e.g. File Explorer or Visual Studio Code).

## How to manage your files

By default, you will have a root directory (`openapi`) that contains a sample API definition file (`openapi.yml`). The sample file is already split into its consituent parts, which are contained in the `code_samples`, `components` and `paths` folders.

### Just starting out with API docs?

Use our `openapi.yaml` file to explore OpenAPI CLI. We suggest you [run some basic commands](.docs/quickstart.md) like `lint`, `bundle` and `split` to practice.

### Got your own API definition file?

You can add your files straight into the `openapi` folder and utilize the existing sub-folders when splitting them up for easier maintenance (`split` command) and compiling them back into a single file (`bundle`) for publishing out. Be aware that the more definitions stored in the `openapi` folder, the more cluttered the sub-folders. But hey, if you like clutter then go for it!

For all you neat-freaks out there, you can create new root folders to store each definition. When you run the `split` command in OpenAPI CLI for a specified definition file, the sub-folders will automatically be created under the root and populated with the constituent parts of your main definition file.