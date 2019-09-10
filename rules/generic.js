class Rule {
    getPathPattern() {
        return this._path;
    }

    createError(msg, path) {
        return [{
            message: msg,
            path: path
        }];
    }
}

module.exports = Rule;