# `translate`

The `translate` command helps you to manage multiple translations in your Redocly project (Reef, Revel, or Realm only).
It creates or updates `translations.yaml` files, populating them with "translation keys" that map to elements in your documentation's UI.

This command serves two purposes:

- On first run, `translate` creates (or populates) a file with built-in translation keys for common UI elements.
- On future runs, `translate` adds custom, user-defined translation keys from your `redocly.yaml` or `sidebars.yaml` files.

## Usage

```bash
redocly translate <locale>
redocly translate all
redocly translate --help
redocly translate --version
```

## Options

| Option            | Type    | Description                                                                                                                            |
| ----------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `locale`          | string  | **REQUIRED** Name of a locale folder, inside your project's `l10n` directory, to generate translations for. Use `all` for all locales. |
| `--lint-config`   | string  | Severity level for config file linting. Possible values: `warn`, `error`, `off`. Defaults to `warn`.                                   |
| --project-dir, -d | string  | Path to the project directory. The default value is `.` (current directory).                                                           |
| `--help`          | boolean | Show help.                                                                                                                             |
| `--version`       | boolean | Show version number.                                                                                                                   |

## Examples

The following sections show some common use cases for the `translate` command.

### Populate translation keys for specific locale

The following command generates or updates translations for the Dutch locale:

```bash {% title="Translate specific locale" %}
redocly translate nl-NL
```

The translations are placed in the file `@l10n/nl-NL/translations.yaml`.
If the file (or folder) doesn't exist, they're created and populated with translation keys.

### Populate translation keys for all locales

Use the `all` keyword to generate translations for all the locale folders inside the `@l10n` directory:

```bash {% title="Translate all locales" %}
redocly translate all
```

This command updates the `translation.yaml` files for every locale with a folder in `@l10n`, as shown in the following example:

```treeview {% title="Project with multiple locales" %}
your-awesome-project
├── @l10n/
│   ├── es-ES/
│   │   ├── transcriptions.yaml
│   │   └── ...
│   ├── fr/
│   │   ├── transcriptions.yaml
│   │   └── ...
│   └── nl-NL/
│       ├── transcriptions.yaml
│       └── ...
├── index.md
├── sidebars.md
├── redocly.yaml
└── ...
```

### Populate translation keys in a specific project

Use the `--project-dir` option to run the `translate` command from a parent folder and populate translation keys inside a specific project:

```bash
redocly translate all --project-dir='museum-docs'
```

The following project structure represents the output of running this command from the `projects` folder:

```treeview {% title="Multiple projects in same folder" %}
projects/
├── storage-docs/
├── authentication-docs/
└── museum-docs/
    ├── @l10n/
    │   ├── es-ES/
    │   │   ├── transcriptions.yaml
    │   │   └── ...
    │   ├── fr/
    │   │   ├── transcriptions.yaml
    │   │   └── ...
    │   └── nl-NL/
    │       ├── transcriptions.yaml
    │       └── ...
    ├── index.md
    ├── sidebars.md
    ├── redocly.yaml
    └── ...
```

The `--project-dir` option is designed to help manage multiple projects by reducing the need for traversal.

## Tips for using `translate`

- The command is additive; it doesn't overwrite existing translation keys.

- Custom translation keys used in React components **must be manually added** to the `translation.yaml` file.
  They are not populated by the command.

- After using the command, review a translation file to ensure new translation keys are present.

- Automating this command can help keep translation keys updated across multiple locales.

## Resources

- See how to [configure localization](https://redocly.com/docs/realm/author/how-to/config-l10n) in your Redocly project.

- Configure which languages users can select using the [localization option](https://redocly.com/docs/realm/config/l10n) (`l10n`) in `redocly.yaml`.
