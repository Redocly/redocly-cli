/* eslint-disable import/prefer-default-export */
const urlPattern = new RegExp('^(https?:\\/\\/)?' // protocol
+ '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' // domain name
+ '((\\d{1,3}\\.){3}\\d{1,3}))' // OR ip (v4) address
+ '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' // port and path
+ '(\\?[;&a-z\\d%_.~+=-]*)?' // query string
+ '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator

export const isUrl = (string) => urlPattern.test(string);
export const outputRed = (str) => `\u001b[31m${str}\u001b[39m`;
export const outputUnderline = (str) => `\u001b[4m${str}\u001b[24m`;
export const getLineNumberFromId = (source, charId) => {
  let lineNum = 1;
  let posNum = 0;
  for (let i = 0; i < charId; i += 1) {
    if (source[i] === '\n') {
      lineNum += 1;
      posNum = charId - i;
    }
  }
  return {
    lineNum,
    posNum,
  };
};
