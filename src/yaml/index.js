import { safeLoad } from 'yaml-ast-parser';

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

const getNodeByPath = (tree, path) => {
  if (path.length === 0 || !tree) return tree;
  const nextKey = path.pop();
  let next;
  if ((tree.value && tree.value.mappings) || tree.mappings) {
    next = getMappingChild(tree, nextKey);
  } else if ((tree.value && tree.value.items) || tree.items) {
    next = getSequenceElement(tree, nextKey);
  }
  return getNodeByPath(next, path);
};

const getLineNumberFromId = (source, charId) => {
  let lineNum = 1;
  let posNum;
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

export const getLocationByPath = (path, ctx) => {
  const AST = parseAST(ctx);
  const node = getNodeByPath(AST, path.reverse());
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

export const getCodeFrameForLocation = (start, end, source, linesBefore = 3, linesAfter = 3) => {
  let frameStart = start;
  let frameEnd = end;
  let actualLinesBefore = -1;
  let actualLinesAfter = -1;
  while (actualLinesBefore !== linesBefore) {
    if (source[frameStart] === '\n') actualLinesBefore += 1;
    frameStart -= 1;
  }
  while (actualLinesAfter !== linesAfter) {
    if (source[frameEnd] === '\n') actualLinesAfter += 1;
    frameEnd += 1;
  }
  return source.substring(frameStart + 1, frameEnd + 1);
};

export default getLocationByPath;
