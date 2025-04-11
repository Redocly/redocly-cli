## Set up tab completion for Redocly CLI

Give your `redocly` command superpowers by adding tab completion to your terminal. Run the command to generate the completions, then add the output to your `.bashrc` or equivalent file.

Generation the completion script:

```shell Command
redocly completion
```

The command output contains installation instructions. For example, to install the completion script in `bash`, use:

```shell Command
redocly completion >> ~/.bashrc
```

The approach is similar for other shells. After the installation, restart your terminal for the changes to take effect.
