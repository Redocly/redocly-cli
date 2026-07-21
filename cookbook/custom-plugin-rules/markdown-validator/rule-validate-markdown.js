import markdownlint from 'markdownlint';

const config = {
  // the list is here https://github.com/DavidAnson/markdownlint#rules--aliases
  MD013: { line_length: 120 },
  MD041: false, // first line should be h1
  MD047: false, // should end with newline
};

function checkString(description, ctx) {
  let options = {
    strings: {
      desc: description,
    },
    config: config,
  };

  try {
    const lintResults = markdownlint.sync(options);

    if (lintResults.desc.length) {
      // desc is the key in the options.strings object
      let lines = description.split('\n');

      for (const desc of lintResults.desc) {
        // grab error message
        let message = desc.ruleDescription;
        // add line number context for longer entries
        if (desc.lineNumber > 1) {
          // computer counts from zero, humans count from 1
          const charsByError = lines[desc.lineNumber - 1].substring(0, 20);
          message = `${message} (near: ${charsByError} ...)`;
        }

        ctx.report({
          message: message,
          location: ctx.location.child('description'),
        });
      }
    }
  } catch (error) {
    console.log(error);
  }
}

export default function ValidateMarkdown() {
  console.log('OpenAPI Markdown: validate');
  return {
    Info: {
      enter({ description }, ctx) {
        if (description) {
          return checkString(description, ctx);
        }
      },
    },
    Tag: {
      enter({ description }, ctx) {
        if (description) {
          return checkString(description, ctx);
        }
      },
    },
    Operation: {
      enter({ description }, ctx) {
        if (description) {
          return checkString(description, ctx);
        }
      },
    },
    Parameter: {
      enter({ description }, ctx) {
        if (description) {
          return checkString(description, ctx);
        }
      },
    },
  };
}
