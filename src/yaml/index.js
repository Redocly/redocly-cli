import { safeLoad } from 'yaml-ast-parser';

import { outputRed, outputUnderline, getLineNumberFromId } from '../utils';

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
  // console.log(node);
  const positionStart = getLineNumberFromId(ctx.source, node.startPosition);
  const endPosition = getLineNumberFromId(ctx.source, node.endPosition);
  return {
    startLine: positionStart.lineNum,
    startCol: positionStart.posNum,
    endLine: endPosition.lineNum,
    endCol: endPosition.posNum,
    startIndex: node.startPosition,
    endIndex: node.endPosition,
  };
};

export const getCodeFrameForLocation = (start, end, source, linesBefore = 3, linesAfter = 2) => {
  let frameStart = start;
  let frameEnd = end;
  let actualLinesBefore = -1;
  let actualLinesAfter = -1;
  while (actualLinesBefore !== linesBefore && frameStart !== 0) {
    if (source[frameStart] === '\n') actualLinesBefore += 1;
    frameStart -= 1;
  }
  while (actualLinesAfter !== linesAfter && frameEnd !== source.length) {
    if (source[frameEnd] === '\n') actualLinesAfter += 1;
    frameEnd += 1;
  }
  const codeFrame = source.substring(frameStart + 1, frameEnd + 1);
  const startOffset = start - frameStart;
  const endOffset = startOffset + end - start;
  return `${codeFrame.substring(0, startOffset - 1)}${outputUnderline(outputRed(codeFrame.substring(startOffset - 1, endOffset)))}${codeFrame.substring(endOffset)}`;
};

export default getLocationByPath;
