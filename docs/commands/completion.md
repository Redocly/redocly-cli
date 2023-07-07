# `completion`

## Introduction

The `completion` command generates the scripts to add autocompletion to you bash or zsh shell. This is a handy productivity boost if you regularly use `redocly` from the command line.

## Usage

```bash
redocly completion
```

The output is a script for you to copy and paste, and add to the configuration file for your shell. The instructions are in the comments of the output.

## Examples

From a bash prompt:

```bash
redocly completion
```

Outputs something like this:

```
###-begin-redocly-completions-###
#
# yargs command completion script
#
# Installation: redocly completion >> ~/.bashrc
#    or redocly completion >> ~/.bash_profile on OSX.
#
_redocly_yargs_completions()
{
    local cur_word args type_list

    cur_word="${COMP_WORDS[COMP_CWORD]}"
    args=("${COMP_WORDS[@]}")

    # ask yargs to generate completions.
    type_list=$(redocly --get-yargs-completions "${args[@]}")

    COMPREPLY=( $(compgen -W "${type_list}" -- ${cur_word}) )

    # if no match was found, fall back to filename completion
    if [ ${#COMPREPLY[@]} -eq 0 ]; then
      COMPREPLY=()
    fi

    return 0
}
complete -o default -F _redocly_yargs_completions redocly
###-end-redocly-completions-###
```

The installation instructions are included in the output, showing how to run the command and add it to the correct file:

- `redocly completion >> ~/.bashrc`
- or on OSX: `redocly completion >> ~/.bash_profile`

Users of zsh receive similar output appropriate for their system.
