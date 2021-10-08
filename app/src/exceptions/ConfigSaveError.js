class ConfigSaveError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConfigSaveError';
    }
}

module.exports = ConfigSaveError;
