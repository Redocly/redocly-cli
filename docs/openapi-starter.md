# How to use openapi-starter

The [openapi-starter](https://github.com/Redocly/openapi-starter) is a Redocly project that you can clone to your own GitHub account to more easily manage API definition files either as single files or multiple files.

It automatically creates the required folder structure and generates a basic OpenAPI definition file, which is great if you're new to API reference docs.

Although you can create your own folder structure, we recommend letting `openapi-starter` set it up initially (you can always make changes later). The folder structure is also key when using the OpenAPI `split` and `bundle` commands, which are used to split up large definitions for easier maintenance, and compile the constituent files back into a single file when you're ready to publish your API reference docs.

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

This step clones the project to your local machine so you can use it with [Redocly CLI](quickstart.md).

### Use GitHub Desktop

1. In your copied openapi-starter repo, select the Copy button.
2. Select Open with GitHub Desktop.
3. Select a local path where you want to store the repo folders and files.
4. Select Clone to clone your copied repo to your local machine.
5. In GitHub Desktop, select your tool of choice to explore the folders and files (e.g. File Explorer or Visual Studio Code).

### Use the CLI

1. In your copied openapi-starter repo, select the Code button.
2. In the floating menu that opens, select the URL type to clone (HTTPS, SSH, GitHub CLI). In this example, we're selecting HTTPS.
To understand the difference between these URLs, select the Help (?) icon in the floating menu.
This will open the GitHub documentation in a new browser tab.
3. After choosing the HTTPS URL, select the copy icon to the right of the URL. A brief popup "Copied!" confirms that you've successfully copied the URL.
4. Open your terminal and navigate to the folder where you want to clone the project.
5. In the folder, type git clone, then paste the HTTPS URL. The line in the terminal should look like this:

```sh
git clone your-repo-link
```

6. Press Enter to start the cloning process. Depending on your GitHub account settings and local git setup, you may be asked to provide your credentials to complete the process.
7. When the project is successfully cloned to your local system, you can access it from the terminal or from your file manager of choice to explore the folders and files.


## How to manage your files

By default, you will have a root directory (`openapi`) that contains a sample API definition file (`openapi.yaml`). The sample file is already split into its constituent parts, which are contained in the `code_samples`, `components` and `paths` folders.

### Just starting out with API docs?

Use our `openapi.yaml` file to explore Redocly CLI. We suggest you [run some basic commands](quickstart.md) like `lint`, `bundle` and `split` to practice.

### Got your own API definition file?

You can add your files straight into the `openapi` folder and use the existing sub-folders when splitting them up for easier maintenance (`split` command) and compiling them back into a single file (`bundle`) for publishing out. Be aware that the more definitions stored in the `openapi` folder, the more cluttered the sub-folders. But hey, if you like clutter then go for it!

Prefer things more orderly? Create new root folders to store each definition. When you run the `split` command in Redocly CLI for a specified definition file, the sub-folders will automatically be created under the root and populated with the constituent parts of your main definition file.
