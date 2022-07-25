class RenderProcessError extends Error {
    constructor(error, url, line) {
        super(error.toString());
        this.name = 'RenderProcessError';
        this.error = error;
        this.url = url;
        this.line = line;
    }
}

module.exports = RenderProcessError;
