# `eject`

## Introduction

The `eject` command allows you to customize components by creating a local copy of their source code in your Redocly project.
Use this feature when you need to modify a component's styles, structure, or behavior beyond what's possible through configuration.

Works with Redocly [Revel](https://redocly.com/revel), [Reef](https://redocly.com/reef), or [Realm](https://redocly.com/realm).

## Usage

```bash
redocly eject component <component-path>
redocly eject component <component-path> [--force]
redocly eject component <component-path> [--project-dir=<path>]
redocly eject --help
redocly eject --version
```

## Options

| Option                | Type    | Description                                                                                                  |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `component-path`      | string  | Path to the component or a glob pattern for multiple components.                                             |
| `--force`, `-f`       | boolean | Skip the "overwrite existing" confirmation when ejecting a component that already exists in the destination. |
| `--project-dir`, `-d` | string  | Path to the project directory. The default value is `.` (current directory).                                 |
| `--help`              | boolean | Show help.                                                                                                   |
| `--version`           | boolean | Show version number.                                                                                         |

## Examples

If no component is found when running the `eject` command, then it prints a list of ejectable components.

### Eject a single component

Eject an individual component by passing its filepath.
Components are ejected to the `@theme` folder in the root of your project.

The following command ejects the `Filter` component:

```bash
redocly eject component 'Filter/Filter.tsx'
```

When ejected, the filepath to the ejected component prints to terminal.
In this example, the `Filter` component is ejected to `@theme/components/Filter/Filter.tsx`.

### Eject multiple components

Eject multiple components using the ejection prompt, which is triggered by passing `<folder-name>/**` wrapped in single quotes.

The following command starts an ejection prompt for the `Footer` folder:

```bash
redocly eject component 'Footer/**'
```

Use the ejection prompt to select and eject any components inside the `Footer` folder.

#### Use ejection prompt

Use your keyboard to navigate the ejection prompt.

- Arrows move the cursor.
- Spacebar selects an item (file or folder).
- Enter ejects the selected items.

Selecting an item adds a check mark.
Selecting a folder selects all its children items.

#### Eject all components

To eject all available components, pass the root folders and use the ejection prompt.

```bash
redocly eject component 'components/**'
redocly eject component 'icons/**'
redocly eject component 'layouts/**'
redocly eject component 'markdoc/**'
```

You may need to scroll using the arrow keys to see all the components inside a folder.

### Skip ejection override confirmation

Use the `--force` option to skip the confirmation prompt when ejecting a component that already exists in the destination:

```bash
redocly eject component 'components/Menu/MenuContainer.tsx' --force
```

By including `--force`, this example ejects the `MenuContainer` component to `@theme/components/Menu/MenuContainer.tsx` and replaces any existing file at that location _without a warning_.

### Specify a project folder

Use the `--project-dir` to provide a path to the project where you want to eject a component:

```bash
redocly eject component 'components/Search/SearchDialog.tsx' --project-dir='museum-docs'
```

The following example shows a project structure after the example command runs from the `projects` folder:

```treeview
projects/
├── museum-docs/
│   ├── @theme/
│   │   └── components/
│   │       └── Search/
│   │           └── SearchDialog.tsx
│   ├── museum-api.json
│   ├── redocly.yaml
│   └── ...
├── storage-docs/
└── authentication-docs/
```

The `--project-dir` option is designed to help manage multiple projects by reducing the need for traversal.

## Tips on using `eject`

- Use `eject` when your customization needs outgrow [styling](https://redocly.com/docs/realm/style/how-to/customize-styles) or [configuration](https://redocly.com/docs/realm/config) capabilities.

- A list of ejectable components is printed when no component is found by the `eject` command.

- Ejected components only [override standard components](https://redocly.com/docs/realm/extend/how-to/eject-components#override-core-components) when the new component is located in your `@theme` folder with a matching path and filename.

## Resources

- Learn to [eject components](https://redocly.com/docs/realm/extend/how-to/eject-components) and unlock deeper project customization.
- See how component ejection is used to [add a new color mode](https://redocly.com/docs/realm/extend/how-to/add-color-mode).
