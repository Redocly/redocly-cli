const createError = (msg, node, ctx) => {
    return {
        message: msg,
        path: '/' + ctx.path.join('/'),
        value: node,
        severity: 'ERROR'
    }
};

export default createError;