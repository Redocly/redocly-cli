import { readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

const MIME_TYPES = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const HTML_IMAGE_PATH = /(<img\b[^>]*?\bsrc=["'])([^"']+)/g;
const MARKDOWN_IMAGE_PATH = /(!\[[^\]]*\]\()([^)\s]+)/g;

const InlineDescriptionImages = () => ({
  any: {
    enter(node, { location, report }) {
      if (typeof node?.description !== 'string') return;
      const folder = dirname(location.source.absoluteRef);
      const inlineImage = (match, prefix, imagePath) => {
        const mimeType = MIME_TYPES[extname(imagePath).toLowerCase()];
        if (!mimeType || URL.canParse(imagePath)) return match;
        try {
          const image = readFileSync(resolve(folder, imagePath)).toString('base64');
          return `${prefix}data:${mimeType};base64,${image}`;
        } catch (error) {
          report({
            message: `Failed to read the image "${imagePath}": ${error.message}`,
            location: location.child('description'),
          });
          return match;
        }
      };
      node.description = node.description
        .replace(HTML_IMAGE_PATH, inlineImage)
        .replace(MARKDOWN_IMAGE_PATH, inlineImage);
    },
  },
});

export default () => ({
  id: 'inline-images',
  decorators: {
    oas3: {
      descriptions: InlineDescriptionImages,
    },
  },
});
