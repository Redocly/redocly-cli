const resolveNode = (node, ctx) => {
    if (!node || typeof node !== 'object') return { node, nextPath: null };
    let nextPath;
    Object.keys(node).forEach(p => {
        if (p === '$ref') { 
            nextPath = node.$ref;
            node = resolve(node[p], ctx);
        }
    });
    return {node, nextPath: nextPath};
};

const resolve = (link, ctx) => {
    const steps = link.replace('#/', '').split('/');
    let target = ctx.document;
    for(const step in steps) {
        target = target[steps[step]];
    }
    return target;
};

export default resolveNode;