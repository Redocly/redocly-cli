/** @type {import('@redocly/cli').OasDecorator} */

const openAPIExtensions = /^x-/;

// a console.assert that actually abort execution
// message is str
// bool is boolean
function assert(bool, message) {
  if (!bool) {
    const err = message !== undefined ? new Error(message) : new Error('an error occured');
    throw err;
  }
}

function doRemoveParamFromNode(node, param) {
  assert(typeof param === 'string', 'extension must be a string');
  assert(
    isExtensionValid(param),
    `[Aborting] String "${param}" is not a valid OpenAPI extension, it must begin with "x-"`
  );
  delete node[param];
  console.log('Deleteted extension "%s" from object "%O"', param, node);
}

function isExtensionValid(extension) {
  assert(typeof extension === 'string', 'extension must be a string');
  if (extension.match(openAPIExtensions)) {
    return true;
  } else {
    return false;
  }
}

function removeExtensionsFromNode(node, extensions) {
  const extensionsType = typeof extensions;
  assert(
    extensionsType === 'undefined' || extensionsType === 'string' || extensionsType === 'object',
    `Extensions must be a string or a list of string instead of being of type "${extensionsType}"`
  );
  if (extensions === undefined || extensions === null || extensions === '') {
    console.log('Deleting all OpenAPI extensions (params starting with "x-")...');
    Object.keys(node)
      .filter((param) => param.match(openAPIExtensions))
      .forEach((param) => {
        doRemoveParamFromNode(node, param);
      });
  } else if (extensionsType === 'string') {
    // extensions is a string representing a regex - delete all the params that match this regex
    Object.keys(node)
      .filter((param) => param.match(extensions))
      .forEach((param) => {
        doRemoveParamFromNode(node, param);
      });
  } else {
    // extensions a list
    // only return something if all strings are valid OpenAPI spec, otherwise panic (handled by the assert)
    extensions.forEach((extension) => {
      // extension is a string representing a regex - delete all the params that match this regex
      Object.keys(node)
        .filter((param) => param.match(extension))
        .forEach((param) => {
          doRemoveParamFromNode(node, param);
        });
    });
  }
}

export default function RemoveExtensions({ extensions }) {
  return {
    any: {
      enter: (node, _ctx) => removeExtensionsFromNode(node, extensions),
    },
  };
}
