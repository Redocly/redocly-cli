export function addPrefix(tag: string, tagsPrefix: string) {
  return tagsPrefix ? tagsPrefix + '_' + tag : tag;
}
