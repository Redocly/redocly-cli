# Help for our less-technical users

Here at Redocly, we want everyone to feel comfortable using our products. If you're new to open source, command lines, GitHub and docs-as-code, then this guide is for you!

:::success Tip
We assume that you already have a basic understanding of what an API is.
:::

We recommend reading this guide before you start installing and using our open-source products, so you have the confidence to get the most out of what are (in our humble opinions) some pretty cool tools.

Now, let's get into it!

## What is open-source software?

[opensource.com](https://opensource.com/) nails this definition in a single sentence:

> Open source software is software with source code that anyone can inspect, modify, and enhance.

In recent years, a huge worldwide open-source community has grown — one that values sharing, collaboration and learning. Even if you're not digging around in the codebase or contributing to the docs, by using Redocly's open-source products, you are part of the community.

Redocly offers both open-source and premium products to our customers, but we started out as purely open source!

## The need for well-documented APIs

The growth of the internet has led to more organizations developing their own APIs in order to share data and utilize functionality developed by others. When it comes to documenting APIs, traditional approaches fall short. There are several reasons for this, but the main reason is that docs are kept apart from the code.

Because APIs have no front end, the docs *are* the UI. Developers rely on up-to-date documentation published in an easy-to-read format so they can understand how an API works, and how to implement it into their code. Simply put, without docs, developers can't use an API.

### Types of API documentation

API docs consist of two types of content: *conceptual docs* and *reference docs*.

##### Conceptual docs

Conceptual docs cover things like:
* Getting started tutorials that help developers complete a few simple tasks and build their confidence using the API.
* How calls to the API are authenticated.
* A list of all possible status and error codes that might be returned by the API.
* Rate-limits that determine how many times endpoints can be called, and any associated pricing.

##### Reference docs

Reference docs describe an API in terms of its schema. For example, how requests sent to the API should be structured and how responses returned by the API are formatted. This is important because it tells developers what information is available, in what format requests should be sent, and what data to expect in response.

### Best practices for documenting APIs

It doesn't make sense to maintain documentation manually, making changes in some dusty old Word document each time the development team adds a new endpoint or deprecates an operation. The best way is to 'treat the docs like code'.

## Docs-as-code (Docs-like-code)

Redocly makes tools that utilize the docs-as-code approach to transform API definitions into stylish docs, automating as much of the process as possible. To use our tools effectively, it's essential that you understand docs-as-code principles.

[Write the Docs](https://www.writethedocs.org/guide/docs-as-code/), the global writers' community, describes it like this:

> Documentation as Code (Docs as Code) refers to a philosophy that you should be writing documentation with the same tools as code. This means following the same workflows as development teams, and being integrated in the product team. It enables a culture where writers and developers both feel ownership of documentation, and work together to make it as good as possible.

In essence, docs-as-code makes it easier for developers and technical writers to create and maintain technical documentation such as API docs.

In the docs-as-code universe, API definition files are authored in YAML or JSON following the OpenAPI Specification (more about this soon). Conceptual docs are written in [Markdown](https://www.markdownguide.org/), a simple formatting markup language that can be learned in 10 minutes. Files are managed in any source control system, such as GitHub. Traditional authoring systems and workflows are not needed. Writers get devs, and devs get writers. Everyone is happy!

Redocly products are based entirely around this concept — including our open-source tools Redocly CLI and Redoc. Acting as a 'doc toolchain', they help you to organize your API source files for easy storage and maintenance, then allow you to validate and publish them using simple commands.

Not familiar with commands? Don't worry! You'll get them in no time — [we promise](#what-is-a-command). Tech writers, we see you.

## The OpenAPI Specification (OAS)

An important part of docs-as-code — and documenting APIs — is the OpenAPI Specification (OAS). The OAS is a specification used to describe REST APIs. Usually written in the YAML language (sometimes in JSON), the OAS lets you define each part of an API in a standardized format so that it can be linted (validated) and published by tools such as Redocly CLI and Redoc.

For more information about the specification, take a look at our [introduction to OpenAPI](./docs/resources/learning-openapi.md).

## Introducing... Redocly CLI and Redoc

Now that you understand some basic concepts, this is a good time to get acquainted with our open-source tools: [Redocly CLI](https://redocly.com/redocly-cli/) and [Redoc](https://redocly.com/redoc/).

Redocly CLI allows you to manage complex API reference docs in a multi-file format, apply linting (validation) and quickly bundle them up for publishing. Redoc previews and publishes your API docs as straightforward, interactive documentation in a format that developers love. Both are highly configurable, and offer a range of config options.

Redocly CLI and Redoc are known as CLI tools. The clue is in the name: *Redocly CLI*. CLI stands for Command-Line Interface.

## Mastering the command line

### What is a CLI?

If you're a tech writer who is used to writing and publishing docs using traditional WYSIWYG tools, CLIs can seem scary at first, but they're actually pretty amazing. And bonus: you get to use a retro-looking terminal and pretend you've gone back in time to the 1980s!

A CLI is a little terminal window that sends instructions (known as 'commands') to software and programs installed on your computer. There are many terminals out there. For Redocly CLI and Redoc, we use the `node.js` terminal to send commands.

### What is a command?

A command is exactly that: a written instruction sent to a computer program via a terminal window to command it to take some action.

In the world of Redocly CLI and Redoc, commands are all about API definition files so they revolve around checking them (`lint`), splitting them up for easy maintenance (`split`) and putting them back together for publishing (`bundle`).

Here are some examples of commands that you might type into a terminal window in order to send the Redocly CLI progam some instructions:

`redocly lint`
`redocly split`
`redocly bundle`

Commands are really flexible. You might want to `lint` the heck out of all your definitions or just one you're particularly suspicious of. You might decide to set rules that limit the errors returned. Or you may want to relax the rules for some definitions, and crack the whip on others. You do all of this simply by adding more parameters to the command:

`redocly lint mydefinitions/myapi.yaml`
`redocly lint --max-problems=25`
`redocly split mydefinitions/myotherapi.yaml`

You can even make errors returned by commands look pretty:

`redocly lint --format=stylish`

You'll learn how to [run a command](#how-to-run-a-command) soon. But first, let's get Redocly CLI and Redoc installed.

## Installing Redocly CLI and Redoc
Did you notice our wonderful [Quickstart guide](./docs/quickstart.md)? Did you read it and understand some of it, but not quite enough to install the software? That's OK! The guide was written primarily for developers so we're going to break it down a little more, just for you.

### node.js
The `node.js` terminal is a self-contained environment that works best when sending commands to Redocly CLI and Redoc. You need to install it on your computer.

### GitHub (aka Git)

GitHub is an online version control system used to manage code, along with documentation in formats such as Markdown, HTML and XML. Git allows authorized team members to work on the same source content by checking it out, working in 'branches', then merging those branches back into the source.

You guessed it. Using GitHub to maintain code and docs together is what we mean by docs-as-code!

You need to have a GitHub account before you can install and use Redocly CLI and Redoc.

:::successTip
[GitHub has its own docs](https://docs.github.com/en), but a quick YouTube search will unearth a huge variety of videos to help you get your head around the basics such as branches, forks, cloning, pull requests and projects. Knowing GitHub is not only vital for Redocly CLI and Redoc, it's a great skill to have!
:::

### The openapi-starter project

`openapi-starter` is a [GitHub project](https://github.com/Redocly/openapi-starter) that we provide to our open-source community to help get them started with Redocly CLI. You'll need to [follow the instructions to clone (copy) the project to your own GitHub account](./docs/openapi-starter.md).

:::successTip
The `openapi-starter` instructions mention GitHub Desktop. This is a piece of software that lets you manage GitHub branches on your local computer, work on them offline, then submit 'pull requests' when you're ready for others to review your changes. Again, YouTube will tell you all there is to know about GitHub Desktop.
:::

The `openapi-starter` project automatically creates a folder structure on your local computer that can be used to organize your API definition files. It also provides a sample API definition file (called `openapi.yaml`), which is great if you're new to API definitions. You can use this sample file to play around with commands while you're learning.

Although you can create your own folder structure, we recommend letting `openapi-starter` set it up initially (you can always make changes later, and you can add more API definition files too). The folder structure is also key when using the `split` and `bundle` commands, which are used to split up large definitions for easier maintenance, and compile the constituent files back into a single file when you're ready to publish your API reference docs.

### Installing Redocly CLI
We use [npm](https://www.w3schools.com/whatis/whatis_npm.asp) to package up our software so you can easily install it.

## How to run a command

On your computer:
1. Click **Search**.
2. Type **cmd**.
3. Select to open **Node.js command prompt**.

Now it's time to run a command! `cd` (change directory) points the terminal to the directory where you want the action to take effect. In our example, Jody starts from the default `\Users` directory on her computer and changes to a directory called `\redocly-openapi-starter\myproject` which is the *root* of where all her API definition files are stored:

```bash Command
C:\Users\jodyw>cd C:\Users\jodyw\APIs\redocly-openapi-starter\myproject
```

```bash Output
C:\Users\jodyw\APIs\redocly-openapi-starter\myproject>
```

Jody now decides to run the `lint` command against an API definition file called `customer.yaml` which is stored in the `\myproject` directory. She types `lint redocly customer.yaml` then presses **Enter**.

```
C:\Users\jodyw\APIs\redocly-openapi-starter\myproject> lint redocly customer.yaml
```

Because `lint` found no errors in `customer.yaml` Jody gets the following response from the `lint` command:

```
No configurations were defined in extends -- using built in recommended configuration by default.

validating customer.yaml...
customer.yaml: validated in 44ms

Woohoo! Your OpenAPI definition is valid. 🎉
```

This is just one of many responses that can come back from the [`lint` command](./docs/commands/lint.md), but it gives you a feel for what commands do.

## Why linting is so important
And speaking of linting, let's take a moment to understand what it is and why it's vital to API docs.

Linting your OpenAPI definition ensures that it's valid and adheres to a set of rules and standards. This is especially important if your organization follows the design-first approach to developing APIs. You can use built-in linting rules, create your own custom rules — or a combination of both. Custom rules also extend basic functionality so you can respond to specific use-cases.

## A closer look at the Redocly configuration file
If you *really* want to get the best out of Redocly CLI (and our other products!), you need to get acquainted with `redocly.yaml`, otherwise known as the Redocly configuration file.

Now, we have [a whole page dedicated to the config file](./docs/configuration/configuration-file.mdx). But if you're new to all of this, simply put, this file contains configuration options that allow you to control how Redocly CLI and Redoc behave and how they are used. It helps you set rules to manage multiple API definition files, place limits on commands, and determine how published API docs should look and feel.

When you use software with a UI, there's usually a settings screen that lets you customize things like security, format, and other functionality. Because Redocly CLI uses the command line and doesn't have a traditional UI, we use the `redocly.yaml` file in place of settings.

As you get more comfortable with our products and read the docs, you'll notice that we often mention the 'project directory' or 'working directory', and use phrases like 'at the root of the project directory'. This simply means where your API definition files are stored, and `redocly.yaml` needs to be located there too.

## A final word...

We hope you feel more empowered and confident using Redocly CLI and Redoc. Ready to get started? Then go check out our [Quickstart guide](./docs/quickstart.md). You'll be wrangling those API definition files in no time!