class NotConsecutiveChaptersError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotConsecutiveChaptersError';
    }
}

module.exports = NotConsecutiveChaptersError;
