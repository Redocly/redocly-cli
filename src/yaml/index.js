import { safeLoad } from 'yaml-ast-parser';

import {
  outputRed, outputUnderline, getLineNumberFromId, outputGrey,
} from '../utils';

const parseAST = (ctx) => {
  if (ctx.AST) return ctx.AST;
  ctx.AST = safeLoad(ctx.source);
  return ctx.AST;
};

const getMappingChild = (mapping, childName) => {
  const mappings = mapping.value ? mapping.value.mappings : mapping.mappings;
  const target = mappings
    .filter((child) => child.key.value === childName);
  return target ? target[0] : null;
};

const getSequenceElement = (seq, id) => (seq.value ? seq.value.items[id] : seq.items[id]);

const getNodeByPath = (tree, path, target = 'value') => {
  if (path.length === 0) return target === 'value' ? tree : tree.key;
  const nextKey = path.pop();
  let next;
  if ((tree.value && tree.value.mappings) || tree.mappings) {
    next = getMappingChild(tree, nextKey);
  } else if ((tree.value && tree.value.items) || tree.items) {
    next = getSequenceElement(tree, nextKey);
  }
  return getNodeByPath(next, path, target);
};

export const getLocationByPath = (path, ctx, target) => {
  const AST = parseAST(ctx);
  const node = getNodeByPath(AST, path.reverse(), target);
  if (!node) return null;

  const frame = ctx.source.substring(node.startPosition, node.endPosition + 1);
  const offset = frame.length - frame.trimRight().length;

  const positionStart = getLineNumberFromId(ctx.source, node.startPosition);
  const endPosition = getLineNumberFromId(ctx.source, node.endPosition - offset);
  return {
    startLine: positionStart.lineNum,
    startCol: positionStart.posNum,
    endLine: endPosition.lineNum,
    endCol: endPosition.posNum,
    startIndex: node.startPosition,
    endIndex: node.endPosition,
  };
};

export const getLocationByPathURI = (path, ctx, target) => {
  const pathArray = path.replace('#/', '').split('/');
  return getLocationByPath(pathArray, ctx, target);
};

export const getCodeFrameForLocation = (
  start, end, source, startLine = 1, linesBefore = 3, linesAfter = 2,
) => {
  let frameStart = start;
  let frameEnd = end;
  let actualLinesBefore = 0;
  let actualLinesAfter = 0;

  for (; actualLinesBefore !== linesBefore && frameStart >= 0; frameStart -= 1) {
    if (source[frameStart - 1] === '\n') actualLinesBefore += 1;
  }

  for (; actualLinesAfter !== linesAfter && frameEnd !== source.length; frameEnd += 1) {
    if (source[frameEnd + 2] === '\n') actualLinesAfter += 1;
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

  const lines = codeFrameString.split('\n');

  const maxLineNum = lines.length + startLine;

  let minSpaces = lines.reduce((acc, val) => (val.length > acc ? val.length : acc), 0);


  lines.forEach((line) => {
    let spaces;
    for (spaces = 0; line[spaces] === ' ' && spaces < line.length; spaces += 1);
    if (minSpaces > spaces) minSpaces = spaces;
  });

  lines.forEach((_, id) => {
    const lineNum = String(`0${startLine - actualLinesBefore + id}`).slice(-maxLineNum.toString().length);
    const line = minSpaces >= 4 ? lines[id].slice(minSpaces) : lines[id];
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
