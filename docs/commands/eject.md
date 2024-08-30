# eject

## Introduction

The `eject` command allows you to customize components by creating a local copy of their source code in your Redocly project.
Use this feature when you need to modify a component's styles, structure, or behavior beyond what's possible through configuration.

{% partial file="../_snippets/new-product-alert-commands.md" %}

## Usage

```bash
redocly eject component <component-path>
redocly eject component <component-path> [--force]
redocly eject component <component-path> [--project-dir=<path>]
redocly eject --help
redocly eject --version
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `component-path` | string | Path to the component or a glob pattern for multiple components. |
| `--force`, `-f` | boolean | Skip the "overwrite existing" confirmation when ejecting a component that already exists in the destination. |
| `--project-dir`, `-d` | string | Specifies the destination folder to eject components into. |
| `--help` | boolean | Show help. |
| `--version` | boolean | Show version number. |

## Examples

If no component is found when running the `eject` command, then it prints a list of ejectable components.

### Eject a single component

Eject an individual component by passing it's filepath.

The following command ejects the `Filter` component:

```bash
redocly eject component 'Filter/Filter.tsx'
```

### Eject multiple components using a glob pattern

Eject multiple components by selecting them in the ejecton prompt, which is triggered by passing `<folder-name>/**` wrapped in single quotes.

The following command triggers an ejection prompt for all components inside the `Footer` folder:

```bash
redocly eject component 'Footer/**'
```

#### Eject all components

To eject all available components, pass the root folders and use the ejection prompt.

```bash
redocly eject component 'components/**'
redocly eject component 'icons/**'
redocly eject component 'layouts/**'
redocly eject component 'markdoc/**'
```

### Eject all components

Eject all available components using the ejection prompt triggered by  multiple components by selecting them in the ejecton prompt, which is triggered by passing `<folder-name>/**` wrapped in single quotes.

The following command triggers an ejection prompt for all components inside the `Footer` folder:

```bash
redocly eject component 'Footer/**'
```

You can eject  are the top level folders that can be ejected:
- 'components'

### Skip ejection override confirmation

Use the `--force` option to skip the confirmation prompt when ejecting a component that already exists in the destination:

```bash
redocly eject component 'components/Menu/MenuContainer.tsx' --force
```

### Specify a destination folder

Use the `--project-dir` option to eject components into a specific folder:

```bash
redocly eject component 'components/Search/SearchDialog.tsx' --project-dir='playground'
```