import { safeLoad } from 'yaml-ast-parser';

import {
  outputRed, outputUnderline, getLineNumberFromId, outputGrey,
} from '../utils';

const astCache = {};
const MAX_LINE_LENGTH = 150;

const parseAST = ({ filePath, source }) => {
  if (!astCache[filePath]) {
    astCache[filePath] = safeLoad(source);
  }
  return astCache[filePath];
};

const getMappingChild = (mapping, childName) => {
  const mappings = mapping.value ? mapping.value.mappings : mapping.mappings;
  const target = mappings
    .filter((child) => child.key.value === childName);
  return target ? target[0] : null;
};

const getSequenceElement = (seq, id) => (seq.value ? seq.value.items[id] : seq.items[id]);

const getNodeByPath = (tree, path, target = 'value') => {
  if (path.length === 0) {
    return target === 'key' && tree.key ? tree.key : tree;
  }
  const nextKey = path.pop();

  let next;
  if ((tree.value && tree.value.mappings) || tree.mappings) {
    next = getMappingChild(tree, nextKey);
  } else if ((tree.value && tree.value.items) || tree.items) {
    next = getSequenceElement(tree, nextKey);
  }

  if (!next) return target === 'key' && tree.key ? tree.key : tree;
  return getNodeByPath(next, path, target);
};

const endOfFirstLine = (text) => {
  let i = 0;
  while (text[i] !== '\n' && i <= text.length) i += 1;
  return i;
};

export const getLocationByPath = (path, { filePath, source }, target) => {
  const AST = parseAST({ filePath, source });
  const node = getNodeByPath(AST, path.reverse(), target);
  // TODO: regression test
  // if (!node) {
  //   return null;
  // }

  const frame = source.substring(node.startPosition, node.endPosition + 1);
  const offset = frame.length - frame.trimRight().length;

  let endIndex = node.endPosition;
  const positionStart = getLineNumberFromId(source, node.startPosition);
  const endPosition = getLineNumberFromId(source, node.endPosition - offset);

  // we need this peace of code for case when the found code frame is the whole
  // document.
  // in such case, we want to output just the first line of it.
  // refactoring would be appreciated here.
  if (node.startPosition === 0 && node.endPosition === source.length) {
    endPosition.lineNum = positionStart.lineNum;
    endPosition.posNum = endOfFirstLine(source);
    endIndex = endOfFirstLine(source);
  }

  return {
    startLine: positionStart.lineNum,
    startCol: positionStart.posNum,
    endLine: endPosition.lineNum,
    endCol: endPosition.posNum,
    startIndex: node.startPosition,
    endIndex,
  };
};

export const getCodeFrameForLocation = (
  // FIXME: we should not requre 'startLine' parameter, as it can be calculated implicitly
  // using 'start' parameter
  start, end, source, startLine = 1, linesBefore = 3, linesAfter = 2,
) => {
  let frameStart = start;
  let frameEnd = end;
  let actualLinesBefore = 0;
  let actualLinesAfter = 0;

  while (actualLinesBefore !== linesBefore && frameStart >= 0) {
    if (source[frameStart - 1] === '\n') actualLinesBefore += 1;
    frameStart -= 1;
  }

  // fixme: fix this hardcode +1/+2, also what about windows-style endings
  const codeFrameEndsLine = source[end] === '\n' || source[end + 1] === '\n' || source[end + 2] === '\n';

  // we need this complex condition, so that if the end of codeframe
  // doesn't belong to the end of line
  // we considered it and added additional line to the codeframe
  while ((
    (codeFrameEndsLine && actualLinesAfter !== linesAfter)
    || (!codeFrameEndsLine && actualLinesAfter - 1 !== linesAfter)
  ) && frameEnd < source.length) {
    if (source[frameEnd + 2] === '\n') actualLinesAfter += 1;
    frameEnd += 1;
  }

  const codeFrame = source.substring(frameStart, frameEnd + 1);
  let startOffset = start - frameStart;
  let endOffset = startOffset + end - start;

  if (frameStart === -1) startOffset -= 1;
  if (frameStart === -1) endOffset -= 1;

  const codeFrameStart = codeFrame.substring(0, startOffset);
  const codeFrameEnd = codeFrame.substring(endOffset);
  const codeFrameMain = outputUnderline(outputRed(codeFrame.substring(startOffset, endOffset)));
  let codeFrameString = `${codeFrameStart}${codeFrameMain}${codeFrameEnd}`;

  const fromStart = start === 0;
  const lines = !fromStart ? codeFrameString.split('\n').slice(1) : codeFrameString.split('\n');
  const maxLineNum = lines.length + startLine;


  // Here we do deindenting. First of: find how much spaces there are before the line start,
  // and then -- deindent as much as we can.

  let minSpaces = lines.reduce((acc, val) => (val.length > acc ? val.length : acc), 0);

  lines.forEach((line) => {
    let spaces;
    for (spaces = 0; line[spaces] === ' ' && spaces < line.length; spaces += 1);
    if (minSpaces > spaces) minSpaces = spaces;
  });

  lines.forEach((_, id) => {
    const lineNum = String(`0${startLine - actualLinesBefore + id + (fromStart ? 0 : 1)}`).slice(-maxLineNum.toString().length);
    // Truncating line to avoid too big output
    const line = (minSpaces >= 8 ? lines[id].slice(minSpaces) : lines[id]).substring(0, MAX_LINE_LENGTH);

    if (id <= actualLinesBefore - 1 || id > lines.length - actualLinesAfter - 1) {
      lines[id] = outputGrey(`${lineNum}| ${line}`);
    } else {
      lines[id] = `${outputGrey(`${lineNum}|`)}${outputRed(` ${line}`)}`;
    }
  });

  codeFrameString = lines.join('\n');

  return codeFrameString;
};

export default getLocationByPath;
